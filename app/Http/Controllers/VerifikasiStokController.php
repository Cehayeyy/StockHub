<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\StokHarianMentah;
use App\Models\StokHarianDapurMentah;
use App\Models\StokHarianMenu;
use App\Models\StokHarianDapurMenu;
use App\Models\ActivityLog;
use App\Models\Recipe;
use App\Models\Item;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class VerifikasiStokController extends Controller
{
    public function index(Request $request)
    {
        $tab = $request->get('tab', 'bar');
        $rawDate = $request->get('tanggal') ?: Carbon::now()->toDateString();
        $mondayDate = Carbon::parse($rawDate)->startOfWeek(Carbon::MONDAY)->toDateString();

        if ($tab === 'bar') {
            $items = StokHarianMentah::with('item')
                ->whereDate('tanggal', $mondayDate)
                ->get()
                ->map(fn($item) => [
                    'id' => $item->id,
                    'nama' => $item->item->nama,
                    'satuan' => $item->unit ?? $item->item->satuan,
                    'stok_sistem' => $item->stok_akhir,
                ]);
        } else {
            $items = StokHarianDapurMentah::with('item')
                ->whereDate('tanggal', $mondayDate)
                ->get()
                ->map(fn($item) => [
                    'id' => $item->id,
                    'nama' => $item->item->nama,
                    'satuan' => $item->unit ?? $item->item->satuan,
                    'stok_sistem' => $item->stok_akhir,
                ]);
        }

        return Inertia::render('VerifikasiStok', [
            'items'          => $items,
            'tab'            => $tab,
            'tanggal_picker' => $rawDate,
            'tanggal_data'   => $mondayDate
        ]);
    }

    // ==================== 🔽 SIMPAN KE DATABASE & SINKRONISASI 🔽 ====================
    // ==================== 🔽 SIMPAN KE DATABASE & EFEK DOMINO 🔽 ====================
    // ==================== 🔽 SIMPAN KE DATABASE & EFEK DOMINO MURNI 🔽 ====================
    // ==================== 🔽 SIMPAN KE DATABASE & EFEK DOMINO MURNI 🔽 ====================
    public function store(Request $request)
    {
        $tab = $request->input('tab', 'bar');
        $tanggal = $request->input('tanggal') ?: Carbon::now()->startOfWeek(Carbon::MONDAY)->toDateString();
        $fisikData = $request->input('fisik', []);

        DB::transaction(function () use ($tab, $fisikData) {
            foreach ($fisikData as $id => $stokFisik) {
                $stokFisik = (float)$stokFisik;

                if ($tab === 'bar') {
                    $mentah = StokHarianMentah::find($id);
                    if ($mentah) {
                        $stokSistem = $mentah->stok_awal + $mentah->stok_masuk - $mentah->stok_keluar;
                        $selisih = $stokFisik - $stokSistem;

                        // 1. KOREKSI HARI VERIFIKASI (Hanya ubah keluar/masuk jika ada selisih)
                        if ($selisih != 0) {
                            if ($selisih < 0) {
                                $mentah->stok_keluar += abs($selisih);
                            } else {
                                $mentah->stok_masuk += $selisih;
                            }
                            $mentah->stok_akhir = $stokFisik;
                            $mentah->save();
                        }

                        // Sinkronkan ke menu Bar
                        $this->syncMenuBar($mentah->item_id, $mentah->tanggal);

                        // 2. 🔥 EFEK DOMINO MURNI (CASCADE) 🔥
                        // DIKELUARKAN DARI SYARAT IF, AGAR SELALU JALAN SAAT DIKLIK SIMPAN!
                        $startDate = Carbon::parse($mentah->tanggal)->addDay();
                        $endDate = Carbon::now();

                        $stokEstafet = $stokFisik; // Bawa stok fisik terbaru (misal: 17)

                        for ($date = $startDate; $date->lte($endDate); $date->addDay()) {
                            $currentDateStr = $date->toDateString();

                            // Cari atau Buat Jembatan
                            $hariIni = StokHarianMentah::firstOrCreate(
                                ['item_id' => $mentah->item_id, 'tanggal' => $currentDateStr],
                                ['stok_masuk' => 0, 'stok_keluar' => 0, 'unit' => $mentah->unit]
                            );

                            // Timpa Stok Awal dengan estafet dari hari sebelumnya
                            $hariIni->stok_awal = $stokEstafet;

                            // Hitung ulang Stok Akhir
                            $hariIni->stok_akhir = ($hariIni->stok_awal + $hariIni->stok_masuk) - $hariIni->stok_keluar;
                            $hariIni->save();

                            // Sinkronkan ke menu matang di hari tersebut
                            $this->syncMenuBar($mentah->item_id, $currentDateStr);

                            // Jadikan stok akhir hari ini sebagai estafet untuk besok
                            $stokEstafet = $hariIni->stok_akhir;
                        }
                    }
                } else {
                    // LOGIKA EFEK DOMINO UNTUK DAPUR
                    $mentah = StokHarianDapurMentah::find($id);
                    if ($mentah) {
                        $stokSistem = $mentah->stok_awal + $mentah->stok_masuk - $mentah->stok_keluar;
                        $selisih = $stokFisik - $stokSistem;

                        // 1. KOREKSI HARI VERIFIKASI (Hanya ubah keluar/masuk jika ada selisih)
                        if ($selisih != 0) {
                            if ($selisih < 0) {
                                $mentah->stok_keluar += abs($selisih);
                            } else {
                                $mentah->stok_masuk += $selisih;
                            }
                            $mentah->stok_akhir = $stokFisik;
                            $mentah->save();
                        }

                        $this->syncMenuDapur($mentah->item_id, $mentah->tanggal);

                        // 2. 🔥 EFEK DOMINO MURNI DAPUR 🔥
                        // DIKELUARKAN DARI SYARAT IF, AGAR SELALU JALAN SAAT DIKLIK SIMPAN!
                        $startDate = Carbon::parse($mentah->tanggal)->addDay();
                        $endDate = Carbon::now();

                        $stokEstafet = $stokFisik;

                        for ($date = $startDate; $date->lte($endDate); $date->addDay()) {
                            $currentDateStr = $date->toDateString();

                            $hariIni = StokHarianDapurMentah::firstOrCreate(
                                ['item_id' => $mentah->item_id, 'tanggal' => $currentDateStr],
                                ['stok_masuk' => 0, 'stok_keluar' => 0, 'unit' => $mentah->unit]
                            );

                            $hariIni->stok_awal = $stokEstafet;
                            $hariIni->stok_akhir = ($hariIni->stok_awal + $hariIni->stok_masuk) - $hariIni->stok_keluar;
                            $hariIni->save();

                            $this->syncMenuDapur($mentah->item_id, $currentDateStr);

                            $stokEstafet = $hariIni->stok_akhir;
                        }
                    }
                }
            }
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'activity' => 'Verifikasi Stok',
            'description' => sprintf(
                'Verifikasi stok opname %s pada %s untuk %d item.',
                $tab === 'bar' ? 'bar' : 'dapur',
                Carbon::parse($tanggal)->format('Y-m-d'),
                count($fisikData)
            ),
        ]);

        return back()->with('success', 'Stok berhasil diverifikasi dan disinkronkan ke semua hari!');
    }

    // --- Logika Sinkronisasi Menu Bar ---
    private function syncMenuBar($rawItemId, $date)
    {
        $recipes = Recipe::all()->filter(function ($recipe) use ($rawItemId) {
            if (!is_array($recipe->ingredients)) return false;
            foreach ($recipe->ingredients as $ing) {
                if (isset($ing['item_id']) && $ing['item_id'] == $rawItemId) return true;
            }
            return false;
        });
        if ($recipes->isEmpty()) return;

        $menuItems = Item::whereIn('nama', $recipes->pluck('name'))->get();
        $targetMenus = StokHarianMenu::whereIn('item_id', $menuItems->pluck('id'))->where('tanggal', $date)->get();

        foreach ($targetMenus as $menu) {
            $recipe = Recipe::where('name', $menu->item->nama)->first();
            if (!$recipe) $recipe = Recipe::where('item_id', $menu->item_id)->first();
            if (!$recipe || !is_array($recipe->ingredients)) continue;

            $minCapAwal = 999999; $minCapTotal = 999999; $minCapSisa = 999999;
            foreach ($recipe->ingredients as $ing) {
                $ingId = $ing['item_id'] ?? null;
                $amt = $ing['amount'] ?? 0;
                if (!$ingId || $amt == 0) continue;

                $raw = StokHarianMentah::where('item_id', $ingId)->where('tanggal', $date)->first();
                if ($raw) {
                    $minCapAwal = min($minCapAwal, floor($raw->stok_awal / $amt));
                    $minCapTotal = min($minCapTotal, floor(($raw->stok_awal + $raw->stok_masuk) / $amt));
                    $minCapSisa = min($minCapSisa, floor($raw->stok_akhir / $amt));
                } else {
                    $minCapAwal = 0; $minCapTotal = 0; $minCapSisa = 0; break;
                }
            }

            if ($minCapAwal === 999999) $minCapAwal = 0;
            if ($minCapTotal === 999999) $minCapTotal = 0;
            if ($minCapSisa === 999999) $minCapSisa = 0;

            $menu->stok_awal = $minCapAwal;
            $menu->stok_masuk = max(0, $minCapTotal - $minCapAwal);
            $sisaMatematis = ($menu->stok_awal + $menu->stok_masuk) - $menu->stok_keluar;
            $menu->stok_akhir = min($sisaMatematis, $minCapSisa);
            $menu->save();
        }
    }

    // --- Logika Sinkronisasi Menu Dapur ---
    private function syncMenuDapur($rawItemId, $date)
    {
        $recipes = Recipe::where('division', 'dapur')->get()->filter(function ($recipe) use ($rawItemId) {
            if (!is_array($recipe->ingredients)) return false;
            foreach ($recipe->ingredients as $ing) {
                if (isset($ing['item_id']) && $ing['item_id'] == $rawItemId) return true;
            }
            return false;
        });
        if ($recipes->isEmpty()) return;

        $targetMenus = StokHarianDapurMenu::whereIn('recipe_id', $recipes->pluck('id'))->where('tanggal', $date)->get();

        foreach ($targetMenus as $menu) {
            $recipe = Recipe::find($menu->recipe_id);
            if (!$recipe || !is_array($recipe->ingredients)) continue;

            $minCapAwal = 999999; $minCapTotal = 999999; $minCapSisa = 999999;
            foreach ($recipe->ingredients as $ing) {
                $ingId = $ing['item_id'] ?? null;
                $amt = $ing['amount'] ?? 0;
                if (!$ingId || $amt == 0) continue;

                $raw = StokHarianDapurMentah::where('item_id', $ingId)->where('tanggal', $date)->first();
                if ($raw) {
                    $minCapAwal = min($minCapAwal, floor($raw->stok_awal / $amt));
                    $minCapTotal = min($minCapTotal, floor(($raw->stok_awal + $raw->stok_masuk) / $amt));
                    $minCapSisa = min($minCapSisa, floor($raw->stok_akhir / $amt));
                } else {
                    $minCapAwal = 0; $minCapTotal = 0; $minCapSisa = 0; break;
                }
            }

            if ($minCapAwal === 999999) $minCapAwal = 0;
            if ($minCapTotal === 999999) $minCapTotal = 0;
            if ($minCapSisa === 999999) $minCapSisa = 0;

            $menu->stok_awal = $minCapAwal;
            $menu->stok_masuk = max(0, $minCapTotal - $minCapAwal);
            $sisaMatematis = ($menu->stok_awal + $menu->stok_masuk) - $menu->stok_keluar;
            $menu->stok_akhir = min($sisaMatematis, $minCapSisa);
            $menu->save();
        }
    }

    // ==================== 🔽 EXPORT EXCEL (TIDAK ADA YANG DIHILANGKAN) 🔽 ====================
    public function export(Request $request)
    {
        $tab = $request->get('tab', 'bar');
        $rawDate = $request->get('tanggal') ?: Carbon::now()->toDateString();
        $mondayDate = Carbon::parse($rawDate)->startOfWeek(Carbon::MONDAY)->toDateString();

        // Tangkap data fisik & catatan yang dikirim dari React
        $fisikData = json_decode($request->get('fisik', '{}'), true);
        $sistemData = json_decode($request->get('sistem', '{}'), true);
        $catatanData = json_decode($request->get('catatan', '{}'), true);

        $items = $tab === 'bar'
            ? StokHarianMentah::with('item')->whereDate('tanggal', $mondayDate)->get()
            : StokHarianDapurMentah::with('item')->whereDate('tanggal', $mondayDate)->get();

        $divisionName = $tab === 'bar' ? 'Bar' : 'Dapur';
        $filename = "verifikasi-stok-{$tab}-{$mondayDate}.xls";

        $html = $this->generateExcelHTML($items, $mondayDate, $divisionName, $fisikData, $catatanData, $sistemData);

        return response($html, 200, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ]);
    }

    private function generateExcelHTML($items, $date, $division, $fisikData = [], $catatanData = [], $sistemData = [])
    {
        $formattedDate = Carbon::parse($date)->locale('id')->isoFormat('D MMMM YYYY');

        $html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
        $html .= '<head>';
        $html .= '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />';
        $html .= '<xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
        $html .= '<x:Name>Verifikasi Stok</x:Name>';
        $html .= '<x:WorksheetOptions><x:Print><x:ValidPrinterInfo/></x:Print></x:WorksheetOptions>';
        $html .= '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>';
        $html .= '<style>';
        $html .= 'table { border-collapse: collapse; width: 100%; }';
        $html .= 'th { background-color: #8B5E3C; color: white; font-weight: bold; padding: 10px; text-align: center; border: 1px solid #000; }';
        $html .= 'td { padding: 8px; border: 1px solid #ddd; }';
        $html .= '.text-center { text-align: center; }';
        $html .= '.title { font-size: 16px; font-weight: bold; text-align: center; padding: 10px; }';
        $html .= '.subtitle { font-size: 12px; text-align: center; padding: 5px; color: #666; }';
        $html .= '</style></head><body>';

        $html .= '<div class="title">VERIFIKASI STOK MINGGUAN - ' . strtoupper($division) . '</div>';
        $html .= '<div class="subtitle">Tanggal Acuan: ' . $formattedDate . ' (Senin)</div><br/>';

        $html .= '<table><thead><tr>';
        $html .= '<th>No</th><th>Nama Item</th><th>Satuan</th><th>Stok Sistem (Senin)</th>';
        $html .= '<th>Stok Fisik</th><th>Selisih</th><th>Status</th><th>Catatan</th>';
        $html .= '</tr></thead><tbody>';

        foreach ($items as $index => $item) {
            $namaItem = htmlspecialchars(optional($item->item)->nama ?? '-');
            $satuan = htmlspecialchars($item->unit ?? optional($item->item)->satuan ?? '-');
            // Gunakan snapshot stok sistem dari frontend agar tidak berubah setelah proses simpan sinkronisasi
            $stokSistem = isset($sistemData[$item->id]) ? (float) $sistemData[$item->id] : ($item->stok_akhir ?? 0);

            // Membaca input fisik dari layar, jika kosong default ke stok sistem
            $stokFisik = isset($fisikData[$item->id]) ? $fisikData[$item->id] : $stokSistem;
            $selisih = $stokFisik - $stokSistem;
            $status = $selisih == 0 ? 'Sesuai' : ($selisih > 0 ? 'Lebih' : 'Kurang');
            $selisihDisplay = $selisih > 0 ? '+' . $selisih : (string) $selisih;
            $catatan = !empty($catatanData[$item->id]) ? htmlspecialchars($catatanData[$item->id]) : '-';

            $html .= '<tr>';
            $html .= '<td class="text-center">' . ($index + 1) . '</td>';
            $html .= '<td>' . $namaItem . '</td>';
            $html .= '<td class="text-center">' . $satuan . '</td>';
            $html .= '<td class="text-center">' . $stokSistem . '</td>';
            $html .= '<td class="text-center">' . $stokFisik . '</td>';
            $html .= '<td class="text-center">' . $selisihDisplay . '</td>';
            $html .= '<td class="text-center">' . $status . '</td>';
            $html .= '<td>' . $catatan . '</td>';
            $html .= '</tr>';
        }
        $html .= '</tbody></table></body></html>';

        return $html;
    }
}
