<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Item;
use App\Models\Recipe;
use App\Models\StokHarianDapurMentah;
use App\Models\StokHarianDapurMenu;
use App\Models\StokHarianMentah;
use App\Models\StokHarianMenu;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SalesReportController extends Controller
{
    /**
     * Membuka akses sales report dari tombol dashboard
     */
    public function openFromDashboard(Request $request)
    {
        $user = $request->user();
        if (in_array($user->role, ['owner', 'supervisor'])) {
            abort(403, 'Akses ditolak.');
        }

        // Tandai di sesi bahwa user sah masuk lewat tombol dashboard
        session(['sales_report_unlocked' => true]);

        return redirect()->route('sales-report.index');
    }

    /**
     * Tampilkan halaman Sales Report & daftar menu yang bisa di-order
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // 🔥 CEK HAK AKSES: Cegah Owner dan Supervisor mengakses Sales Report
        if (in_array($user->role, ['owner', 'supervisor'])) {
            abort(403, 'Akses ditolak. Fitur Sales Report khusus untuk Staff.');
        }

        $today = Carbon::today()->toDateString();
        $tanggal = $request->get('tanggal', $today);

        // Tentukan divisi berdasarkan role user (bar atau dapur)
        $division = $user->role === 'bar' ? 'bar' : 'dapur';

        $now = Carbon::now();
        $isAfterNinePM = $now->format('H:i') >= '21:00'; // Cek apakah sudah lewat jam 21:00

        // Cek apakah ada izin revisi aktif yang disetujui
        $izinApproved = \App\Models\IzinRevisi::where('user_id', $user->id)
            ->where('status', 'approved')
            ->where('end_time', '>', $now)
            ->latest()
            ->first();

        // 🔥 Cek apakah user membuka halaman ini melalui tombol Dashboard
        $unlockedFromDashboard = session('sales_report_unlocked', false);

        // 🔥 KUNCI AKTIF JIKA: Belum klik dari dashboard (tanpa izin revisi) ATAU sudah lewat jam 21:00 (tanpa izin revisi)
        $alreadyInputToday = ((! $unlockedFromDashboard && ! $izinApproved) || ($isAfterNinePM && ! $izinApproved));

        // Ambil daftar resep/menu aktif sesuai divisi untuk pilihan di form bill
        $recipes = Recipe::where('division', $division)->get()->map(function ($recipe) use ($tanggal, $division) {
            $stokAkhir = 0;
            if ($division === 'bar') {
                $menuItem = \App\Models\Item::where('nama', $recipe->name)->where('division', 'bar')->first();
                if ($menuItem) {
                    $stokHarian = StokHarianMenu::where('item_id', $menuItem->id)->whereDate('tanggal', $tanggal)->first();
                    $stokAkhir = $stokHarian ? $stokHarian->stok_akhir : 0;
                }
            } else {
                $stokHarian = StokHarianDapurMenu::where('recipe_id', $recipe->id)->whereDate('tanggal', $tanggal)->first();
                $stokAkhir = $stokHarian ? $stokHarian->stok_akhir : 0;
            }

            return [
                'id' => $recipe->id,
                'name' => $recipe->name,
                'division' => $recipe->division,
                'stok_tersedia' => $stokAkhir,
                'harga_jual' => (float) ($recipe->harga_jual_real ?? 0), // 🔥 Ambil langsung dari harga_jual_real resep
            ];
        });

        return Inertia::render('SalesReport/SalesReport', [
            'recipes' => $recipes,
            'tanggal' => $tanggal,
            'alreadyInputToday' => $alreadyInputToday,
            'izinApproved' => $izinApproved,
        ]);
    }

    /**
     * Simpan Nota/Bill baru sekaligus potong stok otomatis
     */
    public function store(Request $request)
    {
        $currentUser = $request->user();

        if (in_array($currentUser->role, ['owner', 'supervisor'])) {
            abort(403, 'Akses ditolak.');
        }

        $partnerNota = $request->input('partner_mitra', 'Internal / Umum (Kasir)');

        $request->validate([
            'tanggal' => 'required|date',
            'nomor_nota' => [
                'required',
                'string',
                'max:255',
                Rule::unique('sales_reports', 'nomor_nota')->where(fn ($query) => $query
                    ->where('tanggal_transaksi', $request->input('tanggal'))
                    ->where('partner_nota', $partnerNota)
                    ->where('user_id', $currentUser->id)),
            ],
            'partner_mitra' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.recipe_id' => 'required|exists:recipes,id',
            'items.*.quantity' => 'required|numeric|min:1',
            'diskon_persen' => 'nullable|numeric|min:0|max:100',
            'fee_mitra' => 'nullable|numeric|min:0',
        ], [
            'nomor_nota.unique' => 'Nomor nota sudah digunakan untuk tanggal, Staff, dan sumber nota yang sama.',
        ]);

        $tanggal = $request->tanggal;
        $userId = Auth::id();

        try {
            DB::transaction(function () use ($request, $tanggal, $userId, $partnerNota) {

                $subtotalMenu = 0;
                $processedItems = [];

                // 1. Hitung subtotal dan siapkan data item
                foreach ($request->items as $row) {
                    $recipeId = $row['recipe_id'];
                    $qty = (float) $row['quantity'];

                    $recipe = Recipe::find($recipeId);
                    if (! $recipe) {
                        throw new \RuntimeException('Resep menu tidak ditemukan.');
                    }

                    $hargaSatuan = (float) ($recipe->harga_jual_real ?? 0);
                    $lineSubtotal = $hargaSatuan * $qty;
                    $subtotalMenu += $lineSubtotal;

                    // Cari item_id yang berelasi dengan resep ini
                    $menuItem = $recipe->item_id
                        ? Item::whereKey($recipe->item_id)->where('division', $recipe->division)->first()
                        : Item::where('nama', $recipe->name)->where('division', $recipe->division)->first();

                    if (! $menuItem) {
                        throw new \RuntimeException("Menu '{$recipe->name}' belum terhubung ke data Item divisi {$recipe->division}.");
                    }

                    $processedItems[] = [
                        'recipe_id' => $recipeId,
                        'item_id' => $menuItem->id,
                        'quantity' => $qty,
                        'harga_satuan' => $hargaSatuan,
                        'subtotal' => $lineSubtotal,
                    ];

                    // 2. Proses Potong Stok Harian (Bar / Dapur)
                    if ($recipe->division === 'bar') {
                        if ($menuItem) {
                            $menuStok = StokHarianMenu::firstOrCreate(
                                ['item_id' => $menuItem->id, 'tanggal' => $tanggal],
                                ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0, 'user_id' => $userId]
                            );
                            $menuStok->stok_keluar = (float) $menuStok->stok_keluar + $qty;
                            $menuStok->stok_akhir = ($menuStok->stok_awal + $menuStok->stok_masuk) - $menuStok->stok_keluar;
                            $menuStok->is_submitted = true;
                            $menuStok->save();

                            if (is_array($recipe->ingredients)) {
                                foreach ($recipe->ingredients as $ing) {
                                    $rawQty = $qty * (float) ($ing['amount'] ?? 0);
                                    $mentah = StokHarianMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $tanggal])->first();
                                    if ($mentah) {
                                        $mentah->stok_keluar = (float) $mentah->stok_keluar + $rawQty;
                                        $mentah->stok_akhir = ($mentah->stok_awal + $mentah->stok_masuk) - $mentah->stok_keluar;
                                        $mentah->save();
                                    }
                                }
                            }
                        }
                    } else {
                        $menuStok = StokHarianDapurMenu::firstOrCreate(
                            ['recipe_id' => $recipeId, 'tanggal' => $tanggal],
                            ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0, 'user_id' => $userId]
                        );
                        $menuStok->stok_keluar = (float) $menuStok->stok_keluar + $qty;
                        $menuStok->stok_akhir = ($menuStok->stok_awal + $menuStok->stok_masuk) - $menuStok->stok_keluar;
                        $menuStok->is_submitted = true;
                        $menuStok->save();

                        if (is_array($recipe->ingredients)) {
                            foreach ($recipe->ingredients as $ing) {
                                $rawQty = $qty * (float) ($ing['amount'] ?? 0);
                                $mentah = StokHarianDapurMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $tanggal])->first();
                                if ($mentah) {
                                    $mentah->stok_keluar = (float) $mentah->stok_keluar + $rawQty;
                                    $mentah->stok_akhir = ($mentah->stok_awal + $mentah->stok_masuk) - $mentah->stok_keluar;
                                    $mentah->save();
                                }
                            }
                        }
                    }
                }

                // 3. Hitung Diskon & Total Bersih Nota
                $diskonPersen = (float) ($request->diskon_persen ?? 0);
                $feeMitra = (float) ($request->fee_mitra ?? 0);
                $nominalDiskon = ($subtotalMenu * $diskonPersen) / 100;
                $totalBersih = ($subtotalMenu - $nominalDiskon) - $feeMitra;

                // 4. Simpan ke Tabel Sales Reports (Utama)
                $salesReport = \App\Models\SalesReport::create([
                    'nomor_nota' => $request->nomor_nota,
                    'tanggal_transaksi' => $tanggal,
                    'partner_nota' => $partnerNota,
                    'diskon_persen' => $diskonPersen,
                    'fee_mitra' => $feeMitra,
                    'subtotal' => $subtotalMenu,
                    'total_bersih' => max(0, $totalBersih),
                    'user_id' => $userId,
                ]);

                // 5. Simpan rincian item ke Sales Report Items
                foreach ($processedItems as $pItem) {
                    \App\Models\SalesReportItem::create([
                        'sales_report_id' => $salesReport->id,
                        'item_id' => $pItem['item_id'],
                        'quantity' => $pItem['quantity'],
                        'harga_satuan' => $pItem['harga_satuan'],
                        'subtotal' => $pItem['subtotal'],
                    ]);
                }

                $sourceNota = $request->partner_mitra ?? 'Internal';
                ActivityLog::create([
                    'user_id' => $userId,
                    'activity' => 'Input Sales Report',
                    'description' => "Berhasil input nota/bill [{$sourceNota}] nomor: {$request->nomor_nota}",
                ]);
            });

            session()->forget('sales_report_unlocked');
            session(['sales_report_submitted_today' => true]);

            return back()->with('success', 'Nota berhasil disimpan dan tercatat di laporan analisa.');

        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Gagal menyimpan nota: '.$e->getMessage()]);
        }
    }
}
