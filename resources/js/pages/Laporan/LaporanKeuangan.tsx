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
        <div className="print-header">
          <h1 className="text-xl font-bold uppercase tracking-wider">LAPORAN KEUANGAN</h1>
          <p className="text-xs text-gray-600">Laporan Keuangan Laba Rugi</p>
          <p className="text-xs font-semibold mt-1">Periode Operasional: {data.periode}</p>
        </div>

        {/* HEADER & FILTER */}
        <div className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Laporan Keuangan Bulanan (Laba Rugi)
            </h1>
            <p className="text-sm text-gray-500">
              Rekap otomatis dari nota penjualan, HPP resep, kerugian bahan, dan biaya operasional.
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
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-3xl border border-gray-100 bg-white p-4 shadow-2xl">
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

        {/* RINGKASAN UTAMA */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">PENDAPATAN</p>
                <h3 className="text-2xl font-extrabold text-stone-800 mt-1">{formatIDR(totalPendapatan)}</h3>
              </div>
              <div className="rounded-xl bg-[#6F4E37]/10 p-3 text-[#6F4E37] no-print"><TrendingUp className="h-6 w-6" /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">PENGELUARAN</p>
                <h3 className="text-2xl font-extrabold text-stone-800 mt-1">{formatIDR(totalPengeluaran)}</h3>
              </div>
              <div className="rounded-xl bg-stone-100 p-3 text-stone-600 no-print"><CreditCard className="h-6 w-6" /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">LABA BERSIH</p>
                <h3 className="text-2xl font-extrabold text-stone-800 mt-1">{formatIDR(labaBersih)}</h3>
              </div>
              <div className="rounded-xl bg-[#6F4E37] p-3 text-white no-print"><DollarSign className="h-6 w-6" /></div>
            </div>
          </div>
        </div>

        {/* RINCIAN LAPORAN LABA RUGI */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#6F4E37]/10 p-2 text-[#6F4E37] no-print"><FileText className="h-5 w-5" /></div>
              <div>
                <h2 className="font-bold text-stone-800">Rincian Laporan Laba Rugi</h2>
                <p className="text-xs text-gray-400">Periode: {data.periode}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* BAGIAN A: PENDAPATAN */}
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#6F4E37]/10 text-xs font-bold text-[#6F4E37]">A</span>
                  <h3 className="font-extrabold text-stone-800">BAGIAN A: PENDAPATAN</h3>
                </div>
                <span className="text-xs font-bold text-gray-400">SUBTOTAL NILAI</span>
              </div>

              <div className="space-y-2.5 pl-8 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>• Penjualan Kotor</span>
                  <span className="font-semibold">{formatIDR(data.penjualanKotor)}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-between rounded-xl bg-stone-100 p-4 font-bold text-stone-800">
                <span>Total Pendapatan</span>
                <span>{formatIDR(totalPendapatan)}</span>
              </div>
            </div>

            {/* BAGIAN B: PENGELUARAN (HPP, Diskon, Fee Mitra, OPEX) */}
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#6F4E37]/10 text-xs font-bold text-[#6F4E37]">B</span>
                  <h3 className="font-extrabold text-stone-800">BAGIAN B: PENGELUARAN</h3>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1 rounded-lg bg-[#4A3228] px-3 py-1 text-xs font-bold text-white hover:bg-[#38251e] no-print cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Input OPEX
                  </button>
                  <span className="text-xs font-bold text-gray-400">SUBTOTAL NILAI</span>
                </div>
              </div>

              <div className="space-y-2.5 pl-8 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>• Total HPP Menu Terjual</span>
                  <span className="font-semibold">{formatIDR(data.hppMenuTerjual)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>• Beban Kerugian Bahan Baku</span>
                  <span className="font-semibold">{formatIDR(data.bebanKerugianBahan)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>• Diskon & Voucher Penjualan Promo</span>
                  <span className="font-semibold">{formatIDR(data.diskonVoucher)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>• Potongan Fee Merchant & Payment Gateway</span>
                  <span className="font-semibold">{formatIDR(data.potonganMerchant)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>• Biaya Gaji & Upah Karyawan</span>
                  <span className="font-semibold">{formatIDR(activeOpex.gaji)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>• Biaya Perlengkapan Konsumabel</span>
                  <span className="font-semibold">{formatIDR(activeOpex.perlengkapan)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>• Biaya Utilitas & Komunikasi</span>
                  <span className="font-semibold">{formatIDR(activeOpex.utilitas)}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-between rounded-xl bg-stone-100 p-4 font-bold text-stone-800">
                <span>Total Pengeluaran</span>
                <span>{formatIDR(totalPengeluaran)}</span>
              </div>
            </div>

            {/* LABA BERSIH (HASIL AKHIR) */}
            <div className="rounded-2xl bg-[#6F4E37]/5 border border-[#6F4E37]/20 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-stone-800">LABA BERSIH</h3>
                <p className="text-xs text-stone-600 mt-1">Total Pendapatan dikurangi Total Pengeluaran</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-stone-800">{formatIDR(labaBersih)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL INPUT OPEX */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-backdrop">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-lg font-bold text-gray-900">Input Biaya Operasional (OPEX)</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSaveOpex} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Biaya Gaji & Upah Karyawan (Rp)</label>
                <input type="text" value={biayaGajiInput} onChange={(e) => handleInputChange(e, setBiayaGajiInput)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Biaya Perlengkapan Konsumabel (Rp)</label>
                <input type="text" value={biayaPerlengkapanInput} onChange={(e) => handleInputChange(e, setBiayaPerlengkapanInput)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Biaya Utilitas & Komunikasi (Rp)</label>
                <input type="text" value={biayaUtilitasInput} onChange={(e) => handleInputChange(e, setBiayaUtilitasInput)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600">Batal</button>
                <button type="submit" className="flex items-center gap-2 rounded-xl bg-[#6F4E37] px-5 py-2 text-sm font-bold text-white shadow-md"><Save className="h-4 w-4" /> Simpan Biaya</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}