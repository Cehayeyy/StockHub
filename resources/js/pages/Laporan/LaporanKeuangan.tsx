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
  Calculator,
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
  const netMarginValue = Number(netMargin);
  const financialStatus =
    labaBersihOpex < 0
      ? { label: "Perlu perhatian", tone: "text-rose-700", description: "Beban melebihi pendapatan" }
      : netMarginValue >= 20
        ? { label: "Sehat", tone: "text-emerald-700", description: "Margin operasional baik" }
        : { label: "Perlu dipantau", tone: "text-amber-700", description: "Margin operasional masih tipis" };
  const hasFinancialData = data.jumlahTransaksi > 0 || totalOpex > 0 || data.bebanKerugianBahan > 0;

  // Handler Filter Bulan
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

      {/* Styling cetak dokumen */}
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

      <div className="financial-report space-y-6 pb-12 print-container">
        {/* KOP SURAT / HEADER KHUSUS DOKUMEN PDF */}
        <div className="print-header">
          <h1 className="text-xl font-bold uppercase tracking-wider">LAPORAN KEUANGAN</h1>
          <p className="text-xs text-gray-600">Laporan Keuangan Komprehensif (Laba Rugi)</p>
          <p className="text-xs font-semibold mt-1">Periode Operasional: {data.periode}</p>
        </div>

        {/* HEADER & FILTER HALAMAN WEB */}
        <div className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Laporan Keuangan Bulanan (Laba Rugi)
            </h1>
            <p className="text-sm text-gray-500">
              Rekap otomatis dari nota penjualan, HPP resep, kerugian bahan yang disetujui, dan biaya operasional.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCalendar((value) => !value)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-2xs transition-all hover:bg-gray-50"
              >
                <Calendar className="h-4 w-4 text-[#6F4E37]" />
                <span>{data.periode}</span>
              </button>

              {showCalendar && (
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-3xl border border-gray-100 bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95">
                  <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Pilih periode
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="w-full cursor-pointer rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6F4E37]"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-2 rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#573d2b] transition cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Ringkasan utama */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Card 1: Pendapatan Bersih */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  PENDAPATAN BERSIH
                </p>
                <h3 className="text-2xl font-extrabold text-stone-800 mt-1">
                  {formatIDR(totalPendapatanBersih)}
                </h3>
              </div>
              <div className="rounded-xl bg-[#6F4E37]/10 p-3 text-[#6F4E37] no-print">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-stone-100">
              <span className="rounded-full bg-stone-100 px-2 py-0.5 font-bold text-stone-600">
                Otomatis POS
              </span>
              <span className="text-stone-500">Realisasi omzet neto</span>
            </div>
          </div>

          {/* Card 2: Total Biaya & Beban */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  TOTAL BIAYA & BEBAN
                </p>
                <h3 className="text-2xl font-extrabold text-stone-800 mt-1">
                  {formatIDR(totalHpp + totalOpex)}
                </h3>
              </div>
              <div className="rounded-xl bg-stone-100 p-3 text-stone-600 no-print">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-stone-100">
              <span className="font-semibold text-stone-600">HPP dan operasional</span>
              <span className="font-bold text-stone-700">
                {totalPendapatanBersih > 0 ? (((totalHpp + totalOpex) / totalPendapatanBersih) * 100).toFixed(1) : 0}% dari Omset
              </span>
            </div>
          </div>

          {/* Card 3: Laba Bersih */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  LABA BERSIH (NET INCOME)
                </p>
                <h3 className="text-2xl font-extrabold text-stone-800 mt-1">
                  {formatIDR(labaBersihOpex)}
                </h3>
              </div>
              <div className="rounded-xl bg-[#6F4E37] p-3 text-white no-print">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-stone-100">
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 font-bold text-stone-700">
                Margin Laba: {netMargin}%
              </span>
              <span className={`font-semibold ${financialStatus.tone}`}>Status: {financialStatus.label}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600 no-print">
          {hasFinancialData ? (
            <span>
              Sumber data: {data.jumlahTransaksi} transaksi penjualan
              {data.transaksiTerakhir ? ` • transaksi terakhir ${data.transaksiTerakhir}` : ""}
              {data.opexUpdatedAt ? ` • OPEX diperbarui ${data.opexUpdatedAt}` : ""}.
            </span>
          ) : (
            <span>Belum ada data keuangan untuk periode ini. Laporan akan terisi setelah transaksi, HPP, kerugian yang disetujui, atau OPEX dicatat.</span>
          )}
        </div>

        {/* DETAIL RINCIAN LABA RUGI KOMPREHENSIF */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#6F4E37]/10 p-2 text-[#6F4E37] no-print">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-stone-800">Rincian Laporan Laba Rugi</h2>
                <p className="text-xs text-gray-400">
                  Standar Akuntansi Sederhana Restoran & F&B — Periode: {data.periode}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-stone-500 bg-white border border-stone-200 px-3 py-1 rounded-full">
              Mata Uang: IDR (Rp)
            </span>
          </div>

          <div className="p-6 space-y-8">
            {/* BAGIAN A: PENDAPATAN */}
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#6F4E37]/10 text-xs font-bold text-[#6F4E37]">
                    A
                  </span>
                  <h3 className="font-extrabold text-stone-800">BAGIAN A: PENDAPATAN</h3>
                </div>
                <span className="text-xs font-bold text-gray-400">SUBTOTAL NILAI</span>
              </div>

              <div className="space-y-2.5 pl-8 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>• Penjualan Kotor (Otomatis Kasir POS)</span>
                  <span className="font-semibold">{formatIDR(data.penjualanKotor)}</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>- Dikurangi: Diskon & Voucher Penjualan Promo</span>
                  <span>- {formatIDR(data.diskonVoucher)}</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>- Dikurangi: Potongan Fee Merchant & Payment Gateway (Ojol/QRIS)</span>
                  <span>- {formatIDR(data.potonganMerchant)}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-between rounded-xl bg-stone-100 p-4 font-bold text-stone-800">
                <span>Total Pendapatan Bersih (Net Sales)</span>
                <span>{formatIDR(totalPendapatanBersih)}</span>
              </div>
            </div>

            {/* BAGIAN B: BEBAN POKOK PENJUALAN (HPP) */}
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#6F4E37]/10 text-xs font-bold text-[#6F4E37]">
                    B
                  </span>
                  <h3 className="font-extrabold text-stone-800">BAGIAN B: BEBAN POKOK PENJUALAN (HPP)</h3>
                </div>
                <span className="text-xs font-bold text-gray-400">SUBTOTAL NILAI</span>
              </div>

              <div className="space-y-2.5 pl-8 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>• Total HPP Menu Terjual (Akumulasi Bahan Baku & Resep Kasir)</span>
                  <span className="font-semibold">{formatIDR(data.hppMenuTerjual)}</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>• Beban Kerugian Bahan Baku (Waste, Rusak, & Expired)</span>
                  <span>{formatIDR(data.bebanKerugianBahan)}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-between rounded-xl bg-stone-100 p-4 font-bold text-stone-800">
                <span>Total Beban Pokok Penjualan (HPP)</span>
                <span>{formatIDR(totalHpp)}</span>
              </div>
            </div>

            {/* SUBTOTAL REKAPITULASI (LABA KOTOR) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between rounded-xl bg-stone-50 border border-stone-200 p-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#6F4E37]/10 text-[#6F4E37] text-[10px] font-extrabold px-2 py-0.5 rounded">
                    SUBTOTAL REKAPITULASI
                  </span>
                  <span className="font-extrabold text-stone-800">Laba Kotor</span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Rumus: Pendapatan Bersih ({formatIDR(totalPendapatanBersih)}) – Beban Pokok Penjualan ({formatIDR(totalHpp)})
                </p>
              </div>
              <div className="flex items-center gap-4 justify-between md:justify-end">
                <span className="rounded-full bg-white border border-stone-200 px-3 py-1 text-xs font-bold text-stone-700">
                  Gross Margin: {grossMargin}%
                </span>
                <span className="text-xl font-extrabold text-stone-800">
                  {formatIDR(labaKotor)}
                </span>
              </div>
            </div>

            {/* BAGIAN C: BEBAN OPERASIONAL (OPEX) */}
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#6F4E37]/10 text-xs font-bold text-[#6F4E37]">
                    C
                  </span>
                  <div>
                    <h3 className="font-extrabold text-stone-800">
                      BAGIAN C: BEBAN OPERASIONAL (PENGELUARAN WARUNG)
                    </h3>
                    <p className="text-xs text-stone-500">Beban tidak langsung dan pemeliharaan warung bulan berjalan</p>
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

              <div className="mt-4 flex justify-between rounded-xl bg-stone-100 p-4 font-bold text-stone-800">
                <span>Total Beban Operasional (OPEX)</span>
                <span>{formatIDR(totalOpex)}</span>
              </div>
            </div>

            {/* BAGIAN D: LABA BERSIH OPERASIONAL */}
            <div className="rounded-2xl bg-[#6F4E37]/5 border border-[#6F4E37]/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#6F4E37] text-white text-xs font-extrabold px-2.5 py-1 rounded-lg">
                    BAGIAN D
                  </span>
                  <h3 className="text-lg font-extrabold text-stone-800">
                    LABA BERSIH OPERASIONAL (NET PROFIT)
                  </h3>
                </div>
                <p className="text-xs text-stone-600 mt-2">
                  Laba Kotor ({formatIDR(labaKotor)}) dikurangi Beban Operasional ({formatIDR(totalOpex)})
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-stone-700 border border-stone-200">
                  <CheckCircle2 className={`h-4 w-4 ${financialStatus.tone}`} />
                  {financialStatus.description} ({netMargin}% margin bersih)
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                  HASIL AKHIR BERSIH
                </span>
                <div className="text-3xl font-black text-stone-800 mt-1">
                  {formatIDR(labaBersihOpex)}
                </div>
              </div>
            </div>

            {/* KETERANGAN SUMBER DATA */}
            <div className="flex flex-col md:flex-row items-center justify-between pt-4 border-t border-gray-100 text-xs text-gray-500 gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#6F4E37]" />
                <span>
                  Nilai laporan berasal dari data operasional yang tercatat pada periode terpilih.
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span>{data.jumlahTransaksi} transaksi tercatat</span>
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
