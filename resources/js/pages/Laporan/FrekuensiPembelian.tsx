import React, { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, router } from "@inertiajs/react";
import {
  Download,
  Search,
  Flame,
  AlertTriangle,
  Receipt,
  TrendingUp,
  BarChart2,
} from "lucide-react";

interface FrekuensiItemBackend {
  nama_item: string;
  kategori: string;
  frekuensi_pembelian: number;
  total_kuantitas: number;
  total_nominal: number;
}

interface MenuItem {
  id: number;
  peringkat: number;
  namaMenu: string;
  kategori: string;
  hargaSatuan: number;
  totalTerjual: number;
  totalOmset: number;
  statusPopularitas: "Sangat Laku" | "Laku" | "Stabil" | "Perlu Evaluasi" | "Kurang Diminati";
}

interface Props {
  selectedMonth?: string;
  periodeFormatted?: string;
  frekuensiItems?: FrekuensiItemBackend[];
}

export default function FrekuensiPembelian({
  selectedMonth: initialMonth,
  periodeFormatted,
  frekuensiItems = [],
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth || "2026-09");
  const [searchQuery, setSearchQuery] = useState("");

  const formatIDR = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);

  const mapBackendToUI = (items: FrekuensiItemBackend[]): MenuItem[] => {
    if (!items || items.length === 0) return [];

    return items.map((item, index) => {
      const totalTerjual = Number(item.total_kuantitas) || 0;
      const totalOmset = Number(item.total_nominal) || 0;
      const hargaSatuan = totalTerjual > 0 ? Math.round(totalOmset / totalTerjual) : 0;
      const peringkat = index + 1;

      let statusPopularitas: MenuItem["statusPopularitas"] = "Stabil";
      if (peringkat === 1 || totalTerjual >= 100) {
        statusPopularitas = "Sangat Laku";
      } else if (peringkat <= 3 || totalTerjual >= 50) {
        statusPopularitas = "Laku";
      } else if (peringkat <= 7 || totalTerjual >= 20) {
        statusPopularitas = "Stabil";
      } else if (peringkat <= 9) {
        statusPopularitas = "Perlu Evaluasi";
      } else {
        statusPopularitas = "Kurang Diminati";
      }

      return {
        id: index + 1,
        peringkat,
        namaMenu: item.nama_item || "Menu Tanpa Nama",
        kategori: item.kategori || "Umum",
        hargaSatuan,
        totalTerjual,
        totalOmset,
        statusPopularitas,
      };
    });
  };

  const defaultItems: MenuItem[] = [
    { id: 1, peringkat: 1, namaMenu: "Paket Bebek Goreng", kategori: "Makanan Utama", hargaSatuan: 40000, totalTerjual: 120, totalOmset: 4800000, statusPopularitas: "Sangat Laku" },
    { id: 2, peringkat: 2, namaMenu: "Paket Ayam Goreng", kategori: "Makanan Utama", hargaSatuan: 35000, totalTerjual: 95, totalOmset: 3325000, statusPopularitas: "Laku" },
  ];

  const parsedItems = mapBackendToUI(frekuensiItems);
  const menuList = parsedItems.length > 0 ? parsedItems : defaultItems;

  const filteredItems = menuList.filter(
    (item) =>
      item.namaMenu.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPorsiTerjual = menuList.reduce((acc, curr) => acc + curr.totalTerjual, 0);
  const totalOmsetKeseluruhan = menuList.reduce((acc, curr) => acc + curr.totalOmset, 0);

  const menuTerlaris = menuList[0] || { namaMenu: "-", totalTerjual: 0 };
  const menuKurangDiminati = menuList[menuList.length - 1] || { namaMenu: "-", totalTerjual: 0 };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedMonth(val);
    router.get(
      "/laporan/frekuensi-pembelian",
      { bulan: val },
      { preserveState: true, preserveScroll: true }
    );
  };

  const renderStatusBadge = (status: MenuItem["statusPopularitas"]) => {
    switch (status) {
      case "Sangat Laku":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Sangat Laku
          </span>
        );
      case "Laku":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Laku
          </span>
        );
      case "Stabil":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Stabil
          </span>
        );
      case "Perlu Evaluasi":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Perlu Evaluasi
          </span>
        );
      case "Kurang Diminati":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Kurang Diminati
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AppLayout header="Laporan Frekuensi Pembelian Menu (Bulanan)">
      <Head title="Laporan Frekuensi Pembelian Menu" />

      {/* STYLING MEDIA PRINT SUPAYA PDF PAS DI KERTAS & TIDAK KEPOTONG */}
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

        @media print {
          /* Sembunyikan elemen navigasi & tombol */
          header, aside, button, select, input, .no-print {
            display: none !important;
          }

          /* Paksa orientasi kertas ke Landscape agar tabel muat sempurna */
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          body {
            background-color: white !important;
            color: black !important;
            font-size: 10pt !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Header khusus untuk versi PDF/Print */
          .print-header {
            display: block !important;
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }

          .print-header h1 {
            font-size: 16pt !important;
            font-weight: bold;
          }

          /* Atur tabel agar menyesuaikan lebar 100% tanpa scrollbar */
          table {
            width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
          }

          th, td {
            padding: 6px 10px !important;
            font-size: 9pt !important;
          }

          .summary-cards {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 10px !important;
            margin-bottom: 15px !important;
          }
        }

        .print-header {
          display: none;
        }
      `}</style>

      <div className="space-y-6 pb-12 print-container">
        {/* KOP LAPORAN UNTUK PDF */}
        <div className="print-header">
          <h1>WARUNG CANGKRUK</h1>
          <p className="text-xs text-gray-600">Laporan Frekuensi Pembelian Menu (Popularitas Penjualan)</p>
          <p className="text-xs font-semibold mt-1">Periode: {periodeFormatted || selectedMonth}</p>
        </div>

        {/* HEADER & FILTER ACTION WEB */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between no-print">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-1">
              <span>Laporan</span>
              <span>&rsaquo;</span>
              <span className="text-gray-600">Frekuensi Pembelian Bulanan</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Laporan Frekuensi Pembelian Menu (Bulanan)
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Peringkat popularitas dan akumulasi penjualan menu dalam satu bulan.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
            />

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* 3 TOP SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 summary-cards">
          {/* Card 1: Total Porsi Terjual */}
          <div className="wave-card rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/20 to-blue-50/40 p-5 shadow-xs flex items-center justify-between group">
            <div className="space-y-1 relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                TOTAL PORSI TERJUAL
              </p>
              <h3 className="text-3xl font-black text-gray-900">
                {totalPorsiTerjual} <span className="text-lg font-bold">Porsi</span>
              </h3>
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600 mt-1">
                <TrendingUp className="h-3 w-3" />
                Realisasi Penjualan Nota
              </div>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 no-print">
              <Receipt className="h-6 w-6" />
            </div>
          </div>

          {/* Card 2: Menu Terlaris (#1) */}
          <div className="wave-card rounded-2xl border border-amber-100 bg-gradient-to-br from-white via-amber-50/20 to-amber-50/40 p-5 shadow-xs flex items-center justify-between group">
            <div className="space-y-1 relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                MENU TERLARIS (#1)
              </p>
              <h3 className="text-xl font-extrabold text-emerald-600">
                {menuTerlaris.namaMenu}
              </h3>
              <p className="text-xs text-gray-500 font-semibold flex items-center gap-1 mt-1">
                <span>🏆</span> {menuTerlaris.totalTerjual} Porsi terjual
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-500 no-print">
              <Flame className="h-6 w-6" />
            </div>
          </div>

          {/* Card 3: Kurang Diminati */}
          <div className="wave-card rounded-2xl border border-red-100 bg-gradient-to-br from-white via-red-50/20 to-red-50/40 p-5 shadow-xs flex items-center justify-between group">
            <div className="space-y-1 relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                KURANG DIMINATI
              </p>
              <h3 className="text-xl font-extrabold text-red-500">
                {menuKurangDiminati.namaMenu}
              </h3>
              <div className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-500 mt-1">
                <span>&darr;</span> Hanya {menuKurangDiminati.totalTerjual} Porsi terjual
              </div>
            </div>
            <div className="rounded-2xl bg-red-50 p-3 text-red-400 no-print">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* MAIN TABLE CONTAINER */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 md:flex-row md:items-center md:justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-2 text-[#8B5E3C] no-print">
                <BarChart2 className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-800 text-base">
                  Peringkat Popularitas Menu &ndash; {periodeFormatted || selectedMonth}
                </h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600 no-print">
                  {menuList.length} Menu Terdaftar
                </span>
              </div>
            </div>

            <div className="relative w-full md:w-64 no-print">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-4 py-2 text-xs font-semibold text-gray-700 focus:bg-white focus:border-[#8B5E3C] focus:ring-2 focus:ring-[#8B5E3C]/20 focus:outline-none"
              />
            </div>
          </div>

          {/* TABEL PERINGKAT POPULARITAS */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3.5 text-center w-20">PERINGKAT</th>
                  <th className="px-6 py-3.5">NAMA MENU</th>
                  <th className="px-6 py-3.5 text-right">ESTIMASI HARGA</th>
                  <th className="px-6 py-3.5 text-center">TOTAL TERJUAL</th>
                  <th className="px-6 py-3.5 text-right">TOTAL OMSET</th>
                  <th className="px-6 py-3.5 text-center">STATUS POPULARITAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          item.peringkat === 1
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : item.peringkat === 2
                            ? "bg-slate-200 text-slate-700 border border-slate-300"
                            : item.peringkat === 3
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "text-gray-400"
                        }`}
                      >
                        #{item.peringkat}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className={`font-bold ${item.statusPopularitas === "Kurang Diminati" ? "text-red-500" : "text-gray-900"}`}>
                        {item.namaMenu}
                      </div>
                      <div className="text-[11px] font-semibold text-gray-400">
                        Kategori: {item.kategori}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right text-gray-500">
                      {formatIDR(item.hargaSatuan)}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${item.statusPopularitas === "Kurang Diminati" ? "text-red-500" : "text-gray-900"}`}>
                        {item.totalTerjual} porsi
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span className={`font-extrabold ${item.statusPopularitas === "Kurang Diminati" ? "text-red-500" : "text-gray-900"}`}>
                        {formatIDR(item.totalOmset)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {renderStatusBadge(item.statusPopularitas)}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot className="bg-gray-50/80 font-extrabold text-gray-900 border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="px-6 py-4">
                    Total Keseluruhan
                  </td>
                  <td className="px-6 py-4 text-center text-base">
                    {totalPorsiTerjual} Porsi
                  </td>
                  <td className="px-6 py-4 text-right text-lg text-blue-600">
                    {formatIDR(totalOmsetKeseluruhan)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
