import React, { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, router } from "@inertiajs/react";
import {
  TrendingUp,
  CreditCard,
  DollarSign,
  Download,
  Plus,
  Printer,
  CheckCircle2,
  FileText,
  X,
  Save,
  Calculator
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
    otorisasiBy: string;
    otorisasiCode: string;
  };
  selectedMonth?: string;
}

export default function LaporanKeuangan({ data, selectedMonth: initialMonth }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth || "2026-09");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper Format Ribuan dengan Titik (Misal: 4000000 -> "4.000.000")
  const formatNumberWithDots = (val: string | number) => {
    if (val === "" || val === null || val === undefined) return "";
    const cleanNum = String(val).replace(/\D/g, "");
    if (!cleanNum) return "";
    return new Intl.NumberFormat("id-ID").format(Number(cleanNum));
  };

  // Helper Parsing String Ber-titik Menjadi Angka Murni (Misal: "4.000.000" -> 4000000)
  const parseFormattedNumber = (val: string): number => {
    const cleanNum = val.replace(/\D/g, "");
    return cleanNum ? Number(cleanNum) : 0;
  };

  // State Form Input Biaya Operasional
  const [biayaGajiInput, setBiayaGajiInput] = useState<string>(formatNumberWithDots(data.biayaGaji));
  const [biayaPerlengkapanInput, setBiayaPerlengkapanInput] = useState<string>(formatNumberWithDots(data.biayaPerlengkapan));
  const [biayaUtilitasInput, setBiayaUtilitasInput] = useState<string>(formatNumberWithDots(data.biayaUtilitas));

  // Nilai Biaya Operasional Aktif
  const [activeOpex, setActiveOpex] = useState({
    gaji: data.biayaGaji,
    perlengkapan: data.biayaPerlengkapan,
    utilitas: data.biayaUtilitas,
  });

  // Sync state lokal ketika data props dari backend berubah (misal saat ganti bulan)
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

  // Format Mata Uang IDR Resmi
  const formatIDR = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);

  // Kalkulasi Otomatis Laba Rugi
  const totalPendapatanBersih =
    data.penjualanKotor - data.diskonVoucher - data.potonganMerchant;
  const totalHpp = data.hppMenuTerjual + data.bebanKerugianBahan;
  const labaKotor = totalPendapatanBersih - totalHpp;

  const totalOpex = activeOpex.gaji + activeOpex.perlengkapan + activeOpex.utilitas;
  const labaBersihOpex = labaKotor - totalOpex;
  const grossMargin = totalPendapatanBersih > 0 ? ((labaKotor / totalPendapatanBersih) * 100).toFixed(1) : "0";
  const netMargin = totalPendapatanBersih > 0 ? ((labaBersihOpex / totalPendapatanBersih) * 100).toFixed(1) : "0";

  // Handler Filter Bulan
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedMonth(val);
    router.get(
      "/laporan/keuangan",
      { bulan: val },
      { preserveState: true, preserveScroll: true }
    );
  };

  // Handler Perubahan Input Ber-titik
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const rawVal = e.target.value;
    const formatted = formatNumberWithDots(rawVal);
    setter(formatted);
  };

  // Handler Simpan Biaya Operasional Permanen ke Backend Laravel
  const handleSaveOpex = (e: React.FormEvent) => {
    e.preventDefault();

    const gajiVal = parseFormattedNumber(biayaGajiInput);
    const perlengkapanVal = parseFormattedNumber(biayaPerlengkapanInput);
    const utilitasVal = parseFormattedNumber(biayaUtilitasInput);

    // Update state lokal secara cepat
    setActiveOpex({
      gaji: gajiVal,
      perlengkapan: perlengkapanVal,
      utilitas: utilitasVal,
    });

    // Kirim request simpan permanen ke database
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
        onError: (errors) => {
          console.error("Gagal menyimpan OPEX:", errors);
        },
      }
    );
  };

  // Handler Export PDF
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <AppLayout header="Laporan Keuangan Bulanan">
      <Head title={`Laporan Keuangan ${data.periode}`} />

      {/* STYLING MEDIA PRINT & HOVER WAVE */}
      <style>{`
        @keyframes waveAnimation {
          0% { transform: translateY(0px) scale(1) rotate(0deg); }
          50% { transform: translateY(-8px) scale(1.05) rotate(2deg); }
          100% { transform: translateY(0px) scale(1) rotate(0deg); }
        }

        .wave-card {
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .wave-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.08);
        }

        .wave-card::before {
          content: "";
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }

        .wave-card:hover::before {
          opacity: 1;
          animation: waveAnimation 3s ease-in-out infinite;
        }

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
          }

          .print-header {
            display: block !important;
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
        }

        .print-header {
          display: none;
        }
      `}</style>

      <div className="space-y-6 pb-12 print-container">
        {/* KOP SURAT / HEADER KHUSUS DOKUMEN PDF */}
        <div className="print-header">
          <h1 className="text-xl font-bold uppercase tracking-wider">WARUNG CANGKRUK</h1>
          <p className="text-xs text-gray-600">Laporan Keuangan Komprehensif (Laba Rugi)</p>
          <p className="text-xs font-semibold mt-1">Periode Operasional: {data.periode}</p>
        </div>

        {/* HEADER & FILTER HALAMAN WEB */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Laporan Keuangan Bulanan (Laba Rugi)
            </h1>
            <p className="text-sm text-gray-500">
              Laporan laba rugi komprehensif (Income Statement / P&L) dan analisis profitabilitas operasional warung.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
            />

            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* 3 TOP SUMMARY CARDS DENGAN EFEK GELOMBANG */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Card 1: Pendapatan Bersih */}
          <div className="wave-card rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/20 to-blue-50/50 p-6 shadow-xs flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  PENDAPATAN BERSIH
                </p>
                <h3 className="text-2xl font-extrabold text-blue-600 mt-1 transition-transform group-hover:scale-105 origin-left">
                  {formatIDR(totalPendapatanBersih)}
                </h3>
              </div>
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 no-print transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-6">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-100 relative z-10">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
                Otomatis POS
              </span>
              <span className="text-gray-400">Realisasi Omset Netto</span>
            </div>
          </div>

          {/* Card 2: Total Biaya & Beban */}
          <div className="wave-card rounded-3xl border border-red-100 bg-gradient-to-br from-white via-red-50/20 to-red-50/50 p-6 shadow-xs flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  TOTAL BIAYA & BEBAN
                </p>
                <h3 className="text-2xl font-extrabold text-red-500 mt-1 transition-transform group-hover:scale-105 origin-left">
                  {formatIDR(totalHpp + totalOpex)}
                </h3>
              </div>
              <div className="rounded-2xl bg-red-50 p-3 text-red-500 no-print transition-all duration-300 group-hover:bg-red-500 group-hover:text-white group-hover:-rotate-6">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-100 relative z-10">
              <span className="font-semibold text-gray-600">HPP Bahan + Operasional</span>
              <span className="font-bold text-gray-700">
                {totalPendapatanBersih > 0 ? (((totalHpp + totalOpex) / totalPendapatanBersih) * 100).toFixed(1) : 0}% dari Omset
              </span>
            </div>
          </div>

          {/* Card 3: Laba Bersih */}
          <div className="wave-card rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/30 via-emerald-50/60 to-emerald-100/40 p-6 shadow-xs flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  LABA BERSIH (NET INCOME)
                </p>
                <h3 className="text-2xl font-extrabold text-emerald-600 mt-1 transition-transform group-hover:scale-105 origin-left">
                  {formatIDR(labaBersihOpex)}
                </h3>
              </div>
              <div className="rounded-2xl bg-emerald-500 p-3 text-white shadow-sm no-print transition-all duration-300 group-hover:bg-emerald-600 group-hover:scale-110">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-emerald-100/80 relative z-10">
              <span className="rounded-full bg-emerald-200/60 px-2.5 py-0.5 font-bold text-emerald-800">
                Margin Laba: {netMargin}%
              </span>
              <span className="font-semibold text-emerald-700">Status: Sangat Sehat</span>
            </div>
          </div>
        </div>

        {/* DETAIL RINCIAN LABA RUGI KOMPREHENSIF */}
        <div className="rounded-3xl border border-gray-100 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-2 text-[#8B5E3C] no-print">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">Rincian Laporan Laba Rugi Komprehensif</h2>
                <p className="text-xs text-gray-400">
                  Standar Akuntansi Sederhana Restoran & F&B — Periode: {data.periode}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-full">
              Mata Uang: IDR (Rp)
            </span>
          </div>

          <div className="p-6 space-y-8">
            {/* BAGIAN A: PENDAPATAN */}
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-600">
                    A
                  </span>
                  <h3 className="font-extrabold text-gray-800">BAGIAN A: PENDAPATAN (REVENUE)</h3>
                </div>
                <span className="text-xs font-bold text-gray-400">SUBTOTAL NILAI</span>
              </div>

              <div className="space-y-2.5 pl-8 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>• Penjualan Kotor (Otomatis Kasir POS)</span>
                  <span className="font-semibold">{formatIDR(data.penjualanKotor)}</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>- Dikurangi: Diskon & Voucher Penjualan Promo</span>
                  <span>- {formatIDR(data.diskonVoucher)}</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>- Dikurangi: Potongan Fee Merchant & Payment Gateway (Ojol/QRIS)</span>
                  <span>- {formatIDR(data.potonganMerchant)}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-between rounded-2xl bg-blue-50/60 p-4 font-bold text-blue-900">
                <span>Total Pendapatan Bersih (Net Sales)</span>
                <span>{formatIDR(totalPendapatanBersih)}</span>
              </div>
            </div>

            {/* BAGIAN B: BEBAN POKOK PENJUALAN (HPP) */}
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-xs font-bold text-amber-700">
                    B
                  </span>
                  <h3 className="font-extrabold text-gray-800">BAGIAN B: BEBAN POKOK PENJUALAN (HPP / COGS)</h3>
                </div>
                <span className="text-xs font-bold text-gray-400">SUBTOTAL NILAI</span>
              </div>

              <div className="space-y-2.5 pl-8 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>• Total HPP Menu Terjual (Akumulasi Bahan Baku & Resep Kasir)</span>
                  <span className="font-semibold">{formatIDR(data.hppMenuTerjual)}</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>• Beban Kerugian Bahan Baku (Waste, Rusak, & Expired)</span>
                  <span>{formatIDR(data.bebanKerugianBahan)}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-between rounded-2xl bg-gray-50 p-4 font-bold text-gray-800">
                <span>Total Beban Pokok Penjualan (HPP)</span>
                <span>{formatIDR(totalHpp)}</span>
              </div>
            </div>

            {/* SUBTOTAL REKAPITULASI (LABA KOTOR) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between rounded-2xl bg-emerald-50/40 border border-emerald-100 p-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-200 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                    SUBTOTAL REKAPITULASI
                  </span>
                  <span className="font-extrabold text-emerald-900">Laba Kotor (Gross Profit)</span>
                </div>
                <p className="text-xs text-emerald-600 mt-1">
                  Rumus: Pendapatan Bersih ({formatIDR(totalPendapatanBersih)}) – Beban Pokok Penjualan ({formatIDR(totalHpp)})
                </p>
              </div>
              <div className="flex items-center gap-4 justify-between md:justify-end">
                <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-800">
                  Gross Margin: {grossMargin}%
                </span>
                <span className="text-xl font-extrabold text-emerald-700">
                  {formatIDR(labaKotor)}
                </span>
              </div>
            </div>

            {/* BAGIAN C: BEBAN OPERASIONAL (OPEX) */}
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-100 text-xs font-bold text-red-600">
                    C
                  </span>
                  <div>
                    <h3 className="font-extrabold text-gray-800">
                      BAGIAN C: BEBAN OPERASIONAL (PENGELUARAN WARUNG)
                    </h3>
                    <p className="text-xs text-gray-400">Beban tidak langsung dan pemeliharaan warung bulan berjalan</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#4A3228] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#38251e] transition cursor-pointer no-print"
                >
                  <Plus className="h-4 w-4" />
                  Input Biaya Operasional
                </button>
              </div>

              <div className="space-y-2.5 pl-8 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>• Biaya Gaji & Upah Karyawan (Bar dan Dapur)</span>
                  <span className="font-semibold">{formatIDR(activeOpex.gaji)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>• Biaya Perlengkapan Konsumabel (Tisu, Sabun Cuci, Kantong Plastik, Cup Takeaway)</span>
                  <span className="font-semibold">{formatIDR(activeOpex.perlengkapan)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>• Biaya Utilitas & Komunikasi (Listrik PLN, Air PDAM, Gas LPG & WiFi Internet)</span>
                  <span className="font-semibold">{formatIDR(activeOpex.utilitas)}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-between rounded-2xl bg-gray-50 p-4 font-bold text-gray-800">
                <span>Total Beban Operasional (OPEX)</span>
                <span>{formatIDR(totalOpex)}</span>
              </div>
            </div>

            {/* BAGIAN D: LABA BERSIH OPERASIONAL */}
            <div className="rounded-3xl bg-emerald-100/60 border border-emerald-300 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-lg">
                    BAGIAN D
                  </span>
                  <h3 className="text-lg font-extrabold text-emerald-950">
                    LABA BERSIH OPERASIONAL (NET PROFIT)
                  </h3>
                </div>
                <p className="text-xs text-emerald-800 mt-2">
                  Laba Kotor ({formatIDR(labaKotor)}) dikurangi Beban Operasional ({formatIDR(totalOpex)})
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-200/80 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  Kinerja Finansial Sangat Baik (+{netMargin}% Net Margin)
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  HASIL AKHIR BERSIH
                </span>
                <div className="text-3xl font-black text-emerald-700 mt-1">
                  {formatIDR(labaBersihOpex)}
                </div>
              </div>
            </div>

            {/* FOOTER VERIFIKASI */}
            <div className="flex flex-col md:flex-row items-center justify-between pt-4 border-t border-gray-100 text-xs text-gray-500 gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>
                  Diverifikasi secara Digital oleh <strong>{data.otorisasiBy}</strong>
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span>Otorisasi ID: {data.otorisasiCode}</span>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="flex items-center gap-1 font-bold text-gray-700 hover:text-black transition no-print cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  Cetak Ringkasan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DIALOG INPUT BIAYA OPERASIONAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs modal-backdrop">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-[#6F4E37]/10 p-2 text-[#6F4E37]">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Input Biaya Operasional (OPEX)</h3>
                  <p className="text-xs text-gray-500">Periode: {data.periode}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOpex} className="mt-5 space-y-4">
              {/* Field 1: Biaya Gaji */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                  Biaya Gaji & Upah Karyawan (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-gray-400">Rp</span>
                  <input
                    type="text"
                    value={biayaGajiInput}
                    onChange={(e) => handleInputChange(e, setBiayaGajiInput)}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm font-semibold focus:border-[#6F4E37] focus:ring-2 focus:ring-[#6F4E37]/20 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Gaji Bar dan Dapur</p>
              </div>

              {/* Field 2: Biaya Perlengkapan */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                  Biaya Perlengkapan Konsumabel (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-gray-400">Rp</span>
                  <input
                    type="text"
                    value={biayaPerlengkapanInput}
                    onChange={(e) => handleInputChange(e, setBiayaPerlengkapanInput)}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm font-semibold focus:border-[#6F4E37] focus:ring-2 focus:ring-[#6F4E37]/20 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Tisu, Sabun, Plastik & Cup Takeaway</p>
              </div>

              {/* Field 3: Biaya Utilitas */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                  Biaya Utilitas & Komunikasi (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-gray-400">Rp</span>
                  <input
                    type="text"
                    value={biayaUtilitasInput}
                    onChange={(e) => handleInputChange(e, setBiayaUtilitasInput)}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm font-semibold focus:border-[#6F4E37] focus:ring-2 focus:ring-[#6F4E37]/20 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Listrik PLN, Air PDAM, Gas LPG & Internet</p>
              </div>

              {/* Ringkasan Subtotal Input */}
              <div className="rounded-2xl bg-amber-50/60 p-4 border border-amber-200/60 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">Total Pengeluaran OPEX Baru:</span>
                <span className="text-base font-extrabold text-[#6F4E37]">
                  {formatIDR(
                    parseFormattedNumber(biayaGajiInput) +
                    parseFormattedNumber(biayaPerlengkapanInput) +
                    parseFormattedNumber(biayaUtilitasInput)
                  )}
                </span>
              </div>

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-[#6F4E37] px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-[#573d2b] transition cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  Simpan Biaya
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
