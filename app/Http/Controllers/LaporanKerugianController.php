<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\LaporanKerugian;
use App\Models\ActivityLog;
use App\Models\Recipe;
use App\Models\StokHarianMenu;
use App\Models\StokHarianDapurMenu;
use App\Models\StokHarianMentah;
use App\Models\StokHarianDapurMentah;
use App\Http\Controllers\StokHarianController;
use App\Http\Controllers\StokHarianDapurController;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class LaporanKerugianController extends Controller
{
    // ====================================================================
    // 1. SISI STAF: Tampilan Halaman "Laporan Kerugian" dengan Filter & Pagination
    // ====================================================================
    public function index(Request $request)
    {
        $user = Auth::user();
        $division = in_array($user->role, ['bar', 'dapur']) ? $user->role : 'bar';

        $query = LaporanKerugian::with(['item:id,nama,kategori_item,satuan', 'staff:id,name', 'supervisor:id,name'])
            ->where('division', $division)
            ->orderBy('created_at', 'desc');

        // Filter Pencarian
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('alasan', 'like', "%{$search}%")
                  ->orWhereHas('item', function($itemQ) use ($search) {
                      $itemQ->where('nama', 'like', "%{$search}%");
                  });
            });
        }

        // Filter Tanggal
        if ($request->filled('tanggal')) {
            $query->whereDate('created_at', $request->tanggal);
        }

        $laporan = $query->paginate(10)->withQueryString();

        // Ambil daftar bahan baku (Hanya yang berstatus 'Mentah') untuk dropdown borongan
        $bahanMentah = Item::where('division', $division)
            ->whereIn(DB::raw('LOWER(kategori_item)'), ['mentah', 'raw'])
            ->orderBy('nama', 'asc')
            ->get(['id', 'nama', 'satuan']);

        return Inertia::render('AuditData/LaporanKerugian', [
            'laporan' => $laporan,
            'bahanMentah' => $bahanMentah,
            'division' => $division,
            'filters' => $request->only(['search', 'tanggal'])
        ]);
    }

    // ====================================================================
    // 2. SISI STAF: Submit Data Kerugian Borongan (Multi-Item)
    // ====================================================================
    public function store(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|exists:items,id',
            'items.*.kuantitas' => 'required|numeric|min:0.1',
            'items.*.alasan' => 'required|string|max:100',
            'items.*.catatan' => 'nullable|string|max:500',
        ]);

        $user = Auth::user();

        DB::transaction(function () use ($request, $user) {
            $logDetailItems = []; // 🔥 Menyimpan detail kerugian untuk ActivityLog

            foreach ($request->items as $row) {
                $item = Item::findOrFail($row['item_id']);

                LaporanKerugian::create([
                    'item_id' => $row['item_id'],
                    'kuantitas' => $row['kuantitas'],
                    'alasan' => $row['alasan'],
                    'catatan' => $row['catatan'] ?? null,
                    'division' => $item->division,
                    'staff_id' => $user->id,
                    'status' => 'Menunggu Verifikasi',
                ]);

                // Kumpulkan item untuk log
                $logDetailItems[] = [
                    'nama_item' => $item->nama,
                    'jumlah'    => $row['kuantitas'],
                    'satuan'    => $item->satuan ?? 'unit',
                    'alasan'    => $row['alasan']
                ];
            }

            // 🔥 Catat ke Activity Log dalam SATU log untuk semua item
            $jumlahItem = count($logDetailItems);
            ActivityLog::create([
                'user_id'     => $user->id,
                'activity'    => 'Input Kerugian',
                'description' => "Melaporkan kerugian bahan baku ({$jumlahItem} jenis item)",
                'details'     => [
                    'items' => $logDetailItems
                ]
            ]);
        });

        return back()->with('success', 'Laporan kerugian borongan berhasil dikirim ke Supervisor!');
    }

    // ====================================================================
    // SISI SUPERVISOR: Tampilan Halaman "Verifikasi Kerugian"
    // ====================================================================
    public function verifikasiIndex(Request $request)
    {
        $query = LaporanKerugian::with(['item:id,nama,kategori_item,satuan', 'staff:id,name,username,role', 'supervisor:id,name'])
            ->orderByRaw("FIELD(status, 'Menunggu Verifikasi', 'Disetujui', 'Ditolak')") 
            ->orderBy('created_at', 'desc');

        // Filter Pencarian
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('alasan', 'like', "%{$search}%")
                  ->orWhereHas('item', function($itemQ) use ($search) {
                      $itemQ->where('nama', 'like', "%{$search}%");
                  })
                  ->orWhereHas('staff', function($staffQ) use ($search) {
                      $staffQ->where('name', 'like', "%{$search}%")
                             ->orWhere('username', 'like', "%{$search}%");
                  });
            });
        }

        // Filter Tanggal
        if ($request->filled('tanggal')) {
            $query->whereDate('created_at', $request->tanggal);
        }

        $laporan = $query->paginate(10)->withQueryString();

        return Inertia::render('Verifikasi/VerifikasiKerugian', [
            'laporan' => $laporan,
            'filters' => $request->only(['search', 'tanggal'])
        ]);
    }

    // ====================================================================
    // SISI SUPERVISOR: Ekspor Laporan Kerugian ke Excel (.xls)
    // ====================================================================
    public function exportExcel(Request $request)
    {
        $filename = "laporan-kerugian-bahan-baku-" . date('Y-m-d') . ".xlsx";
        return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\KerugianExport(), $filename);
    }

    // ====================================================================
    // 4. SISI SUPERVISOR: Aksi Approve & Reject
    // ====================================================================
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'action' => 'required|in:approve,reject'
        ]);

        $laporan = LaporanKerugian::with('item', 'staff')->findOrFail($id);
        $user = Auth::user();

        if ($laporan->status !== 'Menunggu Verifikasi') {
            return back()->with('error', 'Laporan ini sudah diverifikasi sebelumnya.');
        }

        DB::transaction(function () use ($laporan, $request, $user) {
            $tanggalLaporan = $laporan->created_at->toDateString();
            $itemId = $laporan->item_id;
            $jumlahKerugian = (float) $laporan->kuantitas;

            if ($request->action === 'approve') {
                $laporan->update([
                    'status' => 'Disetujui',
                    'supervisor_id' => $user->id
                ]);

                // 1. Potong Stok Bahan Mentah Harian
                if ($laporan->division === 'bar') {
                    $stokMentah = StokHarianMentah::where('item_id', $itemId)
                        ->whereDate('tanggal', $tanggalLaporan)
                        ->first();

                    if ($stokMentah) {
                        $stokMentah->stok_keluar = (float) $stokMentah->stok_keluar + $jumlahKerugian;
                        $stokMentah->stok_akhir = ($stokMentah->stok_awal + $stokMentah->stok_masuk) - $stokMentah->stok_keluar;
                        $stokMentah->save();
                    }

                    // 🔥 2. KURANGI STOK MENU BAR YANG MENGGUNAKAN BAHAN INI SECARA PROPORSIONAL
                    $recipes = Recipe::where('division', 'bar')->get()->filter(function ($recipe) use ($itemId) {
                        if (!is_array($recipe->ingredients)) return false;
                        foreach ($recipe->ingredients as $ing) {
                            if (isset($ing['item_id']) && $ing['item_id'] == $itemId) return true;
                        }
                        return false;
                    });

                    foreach ($recipes as $recipe) {
                        $amt = 1;
                        foreach ($recipe->ingredients as $ing) {
                            if (isset($ing['item_id']) && $ing['item_id'] == $itemId) {
                                $amt = (float)($ing['amount'] ?? 1);
                                break;
                            }
                        }
                        $porsiLoss = $amt > 0 ? ceil($jumlahKerugian / $amt) : $jumlahKerugian;

                        $menuItem = Item::where('nama', $recipe->name)->where('division', 'bar')->first();
                        if ($menuItem) {
                            $stokMenu = StokHarianMenu::where('item_id', $menuItem->id)
                                ->whereDate('tanggal', $tanggalLaporan)
                                ->first();
                            if ($stokMenu) {
                                $stokMenu->stok_keluar = (float)$stokMenu->stok_keluar + $porsiLoss;
                                $stokMenu->stok_akhir = max(0, ($stokMenu->stok_awal + $stokMenu->stok_masuk) - $stokMenu->stok_keluar);
                                $stokMenu->save();
                            }
                        }
                    }
                } else {
                    $stokMentah = StokHarianDapurMentah::where('item_id', $itemId)
                        ->whereDate('tanggal', $tanggalLaporan)
                        ->first();

                    if ($stokMentah) {
                        $stokMentah->stok_keluar = (float) $stokMentah->stok_keluar + $jumlahKerugian;
                        $stokMentah->stok_akhir = ($stokMentah->stok_awal + $stokMentah->stok_masuk) - $stokMentah->stok_keluar;
                        $stokMentah->save();
                    }

                    // 🔥 2. KURANGI STOK MENU DAPUR YANG MENGGUNAKAN BAHAN INI
                    $recipes = Recipe::where('division', 'dapur')->get()->filter(function ($recipe) use ($itemId) {
                        if (!is_array($recipe->ingredients)) return false;
                        foreach ($recipe->ingredients as $ing) {
                            if (isset($ing['item_id']) && $ing['item_id'] == $itemId) return true;
                        }
                        return false;
                    });

                    foreach ($recipes as $recipe) {
                        $amt = 1;
                        foreach ($recipe->ingredients as $ing) {
                            if (isset($ing['item_id']) && $ing['item_id'] == $itemId) {
                                $amt = (float)($ing['amount'] ?? 1);
                                break;
                            }
                        }
                        $porsiLoss = $amt > 0 ? ceil($jumlahKerugian / $amt) : $jumlahKerugian;

                        $stokMenu = StokHarianDapurMenu::where('recipe_id', $recipe->id)
                            ->whereDate('tanggal', $tanggalLaporan)
                            ->first();
                        if ($stokMenu) {
                            $stokMenu->stok_keluar = (float)$stokMenu->stok_keluar + $porsiLoss;
                            $stokMenu->stok_akhir = max(0, ($stokMenu->stok_awal + $stokMenu->stok_masuk) - $stokMenu->stok_keluar);
                            $stokMenu->save();
                        }
                    }
                }

                // 🔥 Catat Detail Verifikasi (Setuju)
                ActivityLog::create([
                    'user_id'     => $user->id,
                    'activity'    => 'Verifikasi Kerugian',
                    'description' => "Menyetujui laporan kerugian bahan '{$laporan->item->nama}' dari staf {$laporan->staff->name}.",
                    'details'     => [
                        'status'      => 'Disetujui',
                        'pelapor'     => $laporan->staff->name,
                        'nama_item'   => $laporan->item->nama,
                        'jumlah'      => $jumlahKerugian,
                        'alasan'      => $laporan->alasan
                    ]
                ]);

            } else {
                $laporan->update([
                    'status' => 'Ditolak',
                    'supervisor_id' => $user->id
                ]);

                // 🔥 Catat Detail Verifikasi (Tolak)
                ActivityLog::create([
                    'user_id'     => $user->id,
                    'activity'    => 'Verifikasi Kerugian',
                    'description' => "Menolak laporan kerugian bahan '{$laporan->item->nama}' dari staf {$laporan->staff->name}.",
                    'details'     => [
                        'status'      => 'Ditolak',
                        'pelapor'     => $laporan->staff->name,
                        'nama_item'   => $laporan->item->nama,
                        'jumlah'      => $jumlahKerugian,
                        'alasan'      => $laporan->alasan
                    ]
                ]);
            }
        });

        if ($request->action === 'approve') {
            return back()->with('success', 'Laporan kerugian disetujui, stok mentah dan porsi menu harian berhasil disesuaikan!');
        } else {
            return back()->with('success', 'Laporan kerugian telah ditolak.');
        }
    }
}