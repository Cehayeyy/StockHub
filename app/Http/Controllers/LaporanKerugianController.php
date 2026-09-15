<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\LaporanKerugian;
use App\Models\ActivityLog;
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

                ActivityLog::create([
                    'user_id' => $user->id,
                    'activity' => 'Catat Kerugian',
                    'description' => "Melaporkan kerugian bahan '{$item->nama}' sebanyak {$row['kuantitas']} porsi dengan alasan: {$row['alasan']}."
                ]);
            }
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

        // Paginate 10 data per halaman dan pertahankan query string saat pindah halaman
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
        // Ubah bagian ini (hapus 'division' dari dalam select kolom staff)
        $laporan = LaporanKerugian::with(['item:id,nama,satuan', 'staff:id,name,username,role', 'supervisor:id,name'])
            ->orderBy('created_at', 'desc')
            ->get();

        $filename = "laporan-kerugian-bahan-baku-" . date('Y-m-d') . ".xls";

        $html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
        $html .= '<head>';
        $html .= '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />';
        $html .= '<xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
        $html .= '<x:Name>Laporan Kerugian</x:Name>';
        $html .= '<x:WorksheetOptions><x:Print><x:ValidPrinterInfo/></x:Print></x:WorksheetOptions>';
        $html .= '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>';
        $html .= '<style>';
        $html .= 'table { border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 11pt; }';
        $html .= 'th { background-color: #8B5E3C; color: white; font-weight: bold; padding: 10px; text-align: center; border: 1px solid #000; }';
        $html .= 'td { padding: 8px; border: 1px solid #ddd; vertical-align: middle; }';
        $html .= '.text-center { text-align: center; }';
        $html .= '.title { font-size: 16px; font-weight: bold; text-align: center; padding: 10px; color: #333; }';
        $html .= '.subtitle { font-size: 12px; text-align: center; padding: 5px; color: #666; }';
        $html .= '</style></head><body>';

        $html .= '<div class="title">REKAPITULASI LAPORAN KERUGIAN BAHAN BAKU</div>';
        $html .= '<div class="subtitle">Warung Cangkruk - Dicetak pada: ' . date('d F Y H:i') . ' WIB</div><br/>';

        $html .= '<table><thead><tr>';
        $html .= '<th>No</th><th>Tanggal</th><th>Nama Bahan Baku</th><th>Kuantitas</th><th>Alasan Kerugian</th><th>Pelapor (Divisi)</th><th>Status</th><th>Verifikator</th>';
        $html .= '</tr></thead><tbody>';

        foreach ($laporan as $index => $item) {
            $tanggal = date('d F Y', strtotime($item->created_at));
            $namaItem = htmlspecialchars($item->item->nama ?? '-');
            $kuantitas = Number_format($item->kuantitas, 0) . ' porsi';
            $alasan = htmlspecialchars($item->alasan);
            
            // Format pelapor lengkap dengan divisi (Bar / Dapur)
            $staffName = $item->staff->name ?? $item->staff->username ?? 'Staff';
            $divisiStaff = strtolower($item->staff->division ?? $item->staff->role ?? 'umum');
            $pelapor = htmlspecialchars("{$staffName} ({$divisiStaff})");
            
            $status = htmlspecialchars($item->status);
            $verifikator = htmlspecialchars($item->supervisor->name ?? '-');

            $html .= '<tr>';
            $html .= '<td class="text-center">' . ($index + 1) . '</td>';
            $html .= '<td class="text-center">' . $tanggal . '</td>';
            $html .= '<td>' . $namaItem . '</td>';
            $html .= '<td class="text-center">' . $kuantitas . '</td>';
            $html .= '<td>' . $alasan . '</td>';
            $html .= '<td class="text-center">' . $pelapor . '</td>';
            $html .= '<td class="text-center">' . $status . '</td>';
            $html .= '<td class="text-center">' . $verifikator . '</td>';
            $html .= '</tr>';
        }

        $html .= '</tbody></table></body></html>';

        return response($html, 200, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ]);
    }

    // ====================================================================
    // 4. SISI SUPERVISOR: Aksi Approve & Reject
    // ====================================================================
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'action' => 'required|in:approve,reject'
        ]);

        $laporan = LaporanKerugian::findOrFail($id);
        $user = Auth::user();

        // Mencegah error jika data sudah divaildasi sebelumnya
        if ($laporan->status !== 'Menunggu Verifikasi') {
            return back()->with('error', 'Laporan ini sudah diverifikasi sebelumnya.');
        }

        DB::transaction(function () use ($laporan, $request, $user) {
            if ($request->action === 'approve') {
                $laporan->update([
                    'status' => 'Disetujui',
                    'supervisor_id' => $user->id
                ]);

                // Catatan: Logika pemotongan stok otomatis di tabel Stok Harian bisa kita suntikkan di sini nanti
                // Contoh: StokHarianMentah::where('item_id', $laporan->item_id)->decrement('tersisa', $laporan->kuantitas);

                ActivityLog::create([
                    'user_id' => $user->id,
                    'activity' => 'Approve Kerugian',
                    'description' => "Menyetujui laporan kerugian bahan '{$laporan->item->nama}' (ID Laporan: {$laporan->id})."
                ]);

            } else {
                $laporan->update([
                    'status' => 'Ditolak',
                    'supervisor_id' => $user->id
                ]);

                ActivityLog::create([
                    'user_id' => $user->id,
                    'activity' => 'Reject Kerugian',
                    'description' => "Menolak laporan kerugian bahan '{$laporan->item->nama}' (ID Laporan: {$laporan->id})."
                ]);
            }
        });

        $pesan = $request->action === 'approve' ? 'Laporan kerugian staf telah disetujui!' : 'Laporan kerugian ditolak.';
        return back()->with('success', $pesan);
    }
}