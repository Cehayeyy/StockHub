import React, { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, router } from "@inertiajs/react";
import {
  TrendingUp,
  CreditCard,
  DollarSign,
  Download,
  Plus,
  FileText,
  X,
  Save,
  Calendar
} from "lucide-react";

interface Props {
  data: {
    periode: string;
    penjualanKotor: number;
    diskonVoucher: number;
    potonganMerchant: number;
    hppMenuTerjual: number;
    bebanKerugianBahan: number;
    biayaGaji: number;
    biayaPerlengkapan: number;
    biayaUtilitas: number;
    jumlahTransaksi: number;
    transaksiTerakhir: string | null;
    opexUpdatedAt: string | null;
  };
  selectedMonth?: string;
}

export default function LaporanKeuangan({ data, selectedMonth: initialMonth }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(
    initialMonth || new Date().toISOString().slice(0, 7),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const formatNumberWithDots = (val: string | number) => {
    if (val === "" || val === null || val === undefined) return "";
    const cleanNum = String(val).replace(/\D/g, "");
    if (!cleanNum) return "";
    return new Intl.NumberFormat("id-ID").format(Number(cleanNum));
  };

  const parseFormattedNumber = (val: string): number => {
    const cleanNum = val.replace(/\D/g, "");
    return cleanNum ? Number(cleanNum) : 0;
  };

  const [biayaGajiInput, setBiayaGajiInput] = useState<string>(formatNumberWithDots(data.biayaGaji));
  const [biayaPerlengkapanInput, setBiayaPerlengkapanInput] = useState<string>(formatNumberWithDots(data.biayaPerlengkapan));
  const [biayaUtilitasInput, setBiayaUtilitasInput] = useState<string>(formatNumberWithDots(data.biayaUtilitas));

  const [activeOpex, setActiveOpex] = useState({
    gaji: data.biayaGaji,
    perlengkapan: data.biayaPerlengkapan,
    utilitas: data.biayaUtilitas,
  });

  useEffect(() => {
    setActiveOpex({
      gaji: data.biayaGaji,
      perlengkapan: data.biayaPerlengkapan,
      utilitas: data.biayaUtilitas,
    });
    setBiayaGajiInput(formatNumberWithDots(data.biayaGaji));
    setBiayaPerlengkapanInput(formatNumberWithDots(data.biayaPerlengkapan));
    setBiayaUtilitasInput(formatNumberWithDots(data.biayaUtilitas));
  }, [data]);

  const formatIDR = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);

  // Kalkulasi Pendapatan Bersih (Total Penjualan Kotor)
  const totalPendapatan = data.penjualanKotor;

  // Total Pengeluaran (HPP + Beban Kerugian + Diskon + Fee Mitra + OPEX Gaji/Perlengkapan/Utilitas)
  const totalHpp = data.hppMenuTerjual + data.bebanKerugianBahan;
  const totalOpex = activeOpex.gaji + activeOpex.perlengkapan + activeOpex.utilitas;
  const totalPengeluaran = totalHpp + data.diskonVoucher + data.potonganMerchant + totalOpex;

  // Laba Bersih Akhir
  const labaBersih = totalPendapatan - totalPengeluaran;

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedMonth(val);
    router.get(
      "/laporan/keuangan",
      { bulan: val },
      { preserveState: true, preserveScroll: true }
    );
    setShowCalendar(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const rawVal = e.target.value;
    const formatted = formatNumberWithDots(rawVal);
    setter(formatted);
  };

  const handleSaveOpex = (e: React.FormEvent) => {
    e.preventDefault();
    const gajiVal = parseFormattedNumber(biayaGajiInput);
    const perlengkapanVal = parseFormattedNumber(biayaPerlengkapanInput);
    const utilitasVal = parseFormattedNumber(biayaUtilitasInput);

    setActiveOpex({
      gaji: gajiVal,
      perlengkapan: perlengkapanVal,
      utilitas: utilitasVal,
    });

    router.post(
      "/laporan/keuangan/opex",
      {
        periode: selectedMonth,
        biaya_gaji: gajiVal,
        biaya_perlengkapan: perlengkapanVal,
        biaya_utilitas: utilitasVal,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsModalOpen(false);
        },
      }
    );
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <AppLayout header="Laporan Keuangan Bulanan">
      <Head title={`Laporan Keuangan ${data.periode}`} />

      <style>{`
        @media print {
          header, aside, button, input, .no-print, .modal-backdrop {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            font-size: 11pt;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: none !important;
          }
          .print-header {
            display: block !important;
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          /* Hilangkan styling wrapper saat cetak PDF */
          .print-no-wrapper {
            background: none !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
        }
        .print-header {
          display: none;
        }
      `}</style>

      <div className="financial-report py-6 space-y-6 print-container">
        
        <div className="print-header">
          <h1 className="text-xl font-bold uppercase tracking-wider">LAPORAN KEUANGAN</h1>
          <p className="text-xs text-gray-600">Laporan Keuangan Laba Rugi</p>
          <p className="text-xs font-semibold mt-1">Periode Operasional: {data.periode}</p>
        </div>

        {/* 🔥 STRUKTUR CONTAINER UTAMA: KREM LUAR, PUTIH DALAM (STANDAR ENTERPRISE) 🔥 */}
        <div className="rounded-3xl bg-[#F2ECE4] dark:bg-[#2A221C] p-4 md:p-8 shadow-sm border border-amber-200/60 dark:border-[#45372C] print-no-wrapper">
          <div className="rounded-3xl bg-white dark:bg-[#231C17] p-4 md:p-6 shadow-xs border border-gray-100 dark:border-[#3D3127] min-h-[600px] flex flex-col print-no-wrapper">
            
            {/* HEADER & FILTER */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-100 dark:border-[#3D3127] pb-5 xl:border-b-0 xl:pb-0 mb-6 no-print">
              <div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-[#FAF5ED]">Laporan Keuangan Bulanan (Laba Rugi)</h1>
                <p className="text-xs text-gray-500 dark:text-[#A89B8C] mt-0.5">
                  Rekap otomatis dari nota penjualan, HPP resep, kerugian bahan, dan biaya operasional.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
                {/* Date Picker Custom */}
                <div className="relative w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowCalendar((value) => !value)}
                    className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-center gap-2 rounded-full bg-gray-50 dark:bg-[#231C17] border border-gray-200 dark:border-[#45372C] px-5 py-2.5 sm:py-2 text-sm font-bold text-[#8B5E3C] dark:text-amber-400 shadow-2xs hover:bg-gray-100 dark:hover:bg-[#35291F] transition-all outline-none focus:ring-2 focus:ring-[#D9A978]"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{data.periode}</span>
                    </div>
                  </button>

                  {showCalendar && (
                    <div className="absolute right-0 z-20 mt-2 w-64 rounded-3xl border border-gray-100 bg-white p-4 shadow-2xl dark:border-[#45372E] dark:bg-[#2C231D] animate-in fade-in zoom-in-95">
                      <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#E5D8C9]">
                        Pilih periode
                      </label>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        className="w-full cursor-pointer rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[#8B5E3C] dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]"
                      />
                    </div>
                  )}
                </div>

                {/* Tombol Export PDF */}
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="flex items-center justify-center gap-2 rounded-full bg-[#8B5E3C] hover:bg-[#6F4E37] px-5 py-2.5 sm:py-2 text-sm font-bold text-white shadow-md transition w-full sm:w-auto active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            {/* RINGKASAN UTAMA (MENGGUNAKAN BG-GRAY-50 AGAR TIMBUL DI ATAS KANVAS PUTIH) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
              <div className="bg-gray-50 dark:bg-[#1E1915] p-5 rounded-2xl border border-gray-100 dark:border-[#3D3127] flex flex-col justify-between shadow-xs print-no-wrapper">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-[#8E8072]">PENDAPATAN</p>
                    <h3 className="text-2xl font-extrabold text-gray-800 dark:text-[#FAF5ED] mt-1">{formatIDR(totalPendapatan)}</h3>
                  </div>
                  <div className="rounded-2xl bg-[#D9A978]/15 text-[#8B5E3C] dark:bg-amber-400/10 dark:text-amber-400 p-3 shadow-inner no-print">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#1E1915] p-5 rounded-2xl border border-gray-100 dark:border-[#3D3127] flex flex-col justify-between shadow-xs print-no-wrapper">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-[#8E8072]">PENGELUARAN</p>
                    <h3 className="text-2xl font-extrabold text-gray-800 dark:text-[#FAF5ED] mt-1">{formatIDR(totalPengeluaran)}</h3>
                  </div>
                  <div className="rounded-2xl bg-gray-200/50 text-gray-600 dark:bg-[#3A2E26] dark:text-[#E5D8C9] p-3 shadow-inner no-print">
                    <CreditCard className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#1E1915] p-5 rounded-2xl border border-gray-100 dark:border-[#3D3127] flex flex-col justify-between shadow-xs print-no-wrapper">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-[#8E8072]">LABA BERSIH</p>
                    <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{formatIDR(labaBersih)}</h3>
                  </div>
                  <div className="rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 p-3 shadow-inner no-print">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* RINCIAN LAPORAN LABA RUGI */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-xs overflow-hidden transition-colors dark:border-[#3D3127] dark:bg-[#231C17] flex-1">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-[#FAF7F2] dark:border-[#3D3127] dark:bg-[#1E1915]">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#D9A978]/15 p-2 text-[#8B5E3C] shadow-inner no-print"><FileText className="h-5 w-5" /></div>
                  <div>
                    <h2 className="font-bold text-gray-800 dark:text-[#FAF5ED]">Rincian Laporan Laba Rugi</h2>
                    <p className="text-xs text-gray-400 dark:text-[#8E8072]">Periode: {data.periode}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* BAGIAN A: PENDAPATAN */}
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3 dark:border-[#3D3127]">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#D9A978]/15 text-xs font-bold text-[#8B5E3C]">A</span>
                      <h3 className="font-extrabold text-gray-800 dark:text-[#FAF5ED]">A. PENDAPATAN</h3>
                    </div>
                    <span className="text-xs font-bold text-gray-400 dark:text-[#8E8072]">SUBTOTAL NILAI</span>
                  </div>

                  <div className="space-y-2.5 pl-8 text-sm">
                    <div className="flex justify-between text-gray-700 dark:text-[#E5D8C9]">
                      <span>Penjualan Kotor</span>
                      <span className="font-semibold">{formatIDR(data.penjualanKotor)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between rounded-xl bg-gray-50 p-4 font-bold text-gray-800 dark:bg-[#1E1915] dark:text-[#FAF5ED] border border-gray-100 dark:border-[#3D3127]">
                    <span>Total Pendapatan</span>
                    <span>{formatIDR(totalPendapatan)}</span>
                  </div>
                </div>

                {/* BAGIAN B: PENGELUARAN (HPP, Diskon, Fee Mitra, OPEX) */}
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3 dark:border-[#3D3127]">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#D9A978]/15 text-xs font-bold text-[#8B5E3C]">B</span>
                      <h3 className="font-extrabold text-gray-800 dark:text-[#FAF5ED]">B. PENGELUARAN</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-1 rounded-full bg-[#8B5E3C] hover:bg-[#6F4E37] px-4 py-1.5 text-xs font-bold text-white no-print cursor-pointer transition shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" /> Input OPEX
                      </button>
                      <span className="text-xs font-bold text-gray-400 dark:text-[#8E8072]">SUBTOTAL NILAI</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 pl-8 text-sm">
                    <div className="flex justify-between items-start text-gray-700 dark:text-[#E5D8C9]">
                      <div className="flex flex-col">
                        <span>Total HPP Menu Terjual</span>
                      </div>
                      <span className="font-semibold">{formatIDR(data.hppMenuTerjual)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-[#E5D8C9]">
                      <span>Beban Kerugian Bahan Baku</span>
                      <span className="font-semibold">{formatIDR(data.bebanKerugianBahan)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-[#E5D8C9]">
                      <span>Diskon & Voucher Penjualan Promo</span>
                      <span className="font-semibold">{formatIDR(data.diskonVoucher)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-[#E5D8C9]">
                      <span>Potongan Fee Merchant & Payment Gateway</span>
                      <span className="font-semibold">{formatIDR(data.potonganMerchant)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-[#E5D8C9]">
                      <span>Biaya Gaji & Upah Karyawan</span>
                      <span className="font-semibold">{formatIDR(activeOpex.gaji)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-[#E5D8C9]">
                      <span>Biaya Perlengkapan Konsumabel</span>
                      <span className="font-semibold">{formatIDR(activeOpex.perlengkapan)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-[#E5D8C9]">
                      <span>Biaya Utilitas & Komunikasi</span>
                      <span className="font-semibold">{formatIDR(activeOpex.utilitas)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between rounded-xl bg-gray-50 p-4 font-bold text-gray-800 dark:bg-[#1E1915] dark:text-[#FAF5ED] border border-gray-100 dark:border-[#3D3127]">
                    <span>Total Pengeluaran</span>
                    <span>{formatIDR(totalPengeluaran)}</span>
                  </div>
                </div>

                {/* LABA BERSIH (HASIL AKHIR) */}
                <div className="rounded-2xl bg-[#8B5E3C]/5 border border-[#8B5E3C]/20 p-6 flex flex-col md:flex-row items-center justify-between gap-4 dark:bg-[#523522]/40 dark:border-[#76533A]">
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-800 dark:text-[#FAF5ED]">LABA BERSIH</h3>
                    <p className="text-xs text-gray-500 dark:text-[#C5B8A8] mt-1">Total Pendapatan dikurangi Total Pengeluaran</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-gray-800 dark:text-[#FAF5ED]">{formatIDR(labaBersih)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL INPUT OPEX */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 modal-backdrop transition-all">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-gray-100 dark:border-[#45372E] dark:bg-[#2C231D] animate-in fade-in">
            
            <div className="flex flex-col items-center text-center mb-6 relative">
                <button type="button" onClick={() => setIsModalOpen(false)} className="absolute right-0 top-0 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-[#35291F] text-gray-500 transition" aria-label="Tutup">
                    <X className="w-5 h-5" />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-[#D9A978]/15 dark:bg-amber-400/10 text-[#8B5E3C] dark:text-amber-400 flex items-center justify-center mb-3 shadow-inner">
                    <CreditCard className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-extrabold text-gray-800 dark:text-[#FAF5ED]">
                    Input Biaya Operasional (OPEX)
                </h2>
                <p className="text-xs text-gray-400 dark:text-[#A89B8C] mt-1">
                    Perbarui biaya Gaji, Perlengkapan, dan Utilitas untuk periode ini
                </p>
            </div>

            <form onSubmit={handleSaveOpex} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-[#C5B8A8] mb-1.5 ml-1">Biaya Gaji & Upah Karyawan (Rp)</label>
                <input 
                  type="text" 
                  value={biayaGajiInput} 
                  onChange={(e) => handleInputChange(e, setBiayaGajiInput)} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-[#C5B8A8] mb-1.5 ml-1">Biaya Perlengkapan Konsumabel (Rp)</label>
                <input 
                  type="text" 
                  value={biayaPerlengkapanInput} 
                  onChange={(e) => handleInputChange(e, setBiayaPerlengkapanInput)} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-[#C5B8A8] mb-1.5 ml-1">Biaya Utilitas & Komunikasi (Rp)</label>
                <input 
                  type="text" 
                  value={biayaUtilitasInput} 
                  onChange={(e) => handleInputChange(e, setBiayaUtilitasInput)} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]" 
                />
              </div>

              <div className="flex justify-between gap-3 pt-4 mt-6 border-t border-gray-100 dark:border-[#45372E]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 rounded-2xl bg-gray-100 font-bold text-sm text-gray-700 hover:bg-gray-200 transition dark:border-[#4A3A30] dark:text-[#E5D8C9]">Batal</button>
                <button type="submit" className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#8B5E3C] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#6F4E37] transition"><Save className="h-4 w-4" /> Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}