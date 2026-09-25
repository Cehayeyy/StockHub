import React, { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, router } from "@inertiajs/react";
import {
  Download,
  Search,
  Flame,
  AlertTriangle,
  TrendingUp,
  BarChart2,
  Calendar,
  DollarSign,
  Award,
} from "lucide-react";

interface FrekuensiItemBackend {
  nama_item: string;
  kategori: string;
  frekuensi_pembelian: number;
  total_kuantitas: number;
  total_nominal: number;
  total_profit: number;
}

interface MenuItem {
  id: number;
  peringkat: number;
  namaMenu: string;
  kategori: string;
  hargaSatuan: number;
  totalTerjual: number;
  totalOmset: number;
  totalProfit: number;
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
  const [selectedMonth, setSelectedMonth] = useState(
    initialMonth || new Date().toISOString().slice(0, 7),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

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
      const totalProfit = Number(item.total_profit) || 0;
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
        totalProfit,
        statusPopularitas,
      };
    });
  };

  const menuList = mapBackendToUI(frekuensiItems);

  const filteredItems = menuList.filter(
    (item) =>
      item.namaMenu.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPorsiTerjual = menuList.reduce((acc, curr) => acc + curr.totalTerjual, 0);
  const totalOmsetKeseluruhan = menuList.reduce((acc, curr) => acc + curr.totalOmset, 0);
  const totalProfitKeseluruhan = menuList.reduce((acc, curr) => acc + curr.totalProfit, 0);

  // 4 Kategori Utama sesuai Rapat Klien
  const menuTerlaris = menuList.length > 0 ? [...menuList].sort((a, b) => b.totalTerjual - a.totalTerjual)[0] : { namaMenu: "-", totalTerjual: 0 };
  const menuKurangDiminati = menuList.length > 0 ? [...menuList].sort((a, b) => a.totalTerjual - b.totalTerjual)[0] : { namaMenu: "-", totalTerjual: 0 };
  const menuProfitTertinggi = menuList.length > 0 ? [...menuList].sort((a, b) => b.totalProfit - a.totalProfit)[0] : { namaMenu: "-", totalProfit: 0 };
  const menuProfitTerendah = menuList.length > 0 ? [...menuList].sort((a, b) => a.totalProfit - b.totalProfit)[0] : { namaMenu: "-", totalProfit: 0 };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedMonth(val);
    router.get(
      "/laporan/frekuensi-pembelian",
      { bulan: val },
      { preserveState: true, preserveScroll: true }
    );
    setShowCalendar(false);
  };

  const renderStatusBadge = (status: MenuItem["statusPopularitas"]) => {
    switch (status) {
      case "Sangat Laku":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Sangat Laku</span>;
      case "Laku":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600">Laku</span>;
      case "Stabil":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600">Stabil</span>;
      case "Perlu Evaluasi":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600">Perlu Evaluasi</span>;
      case "Kurang Diminati":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600">Kurang Diminati</span>;
      default:
        return null;
    }
  };

  return (
    <AppLayout header="Laporan Frekuensi Pembelian Menu (Bulanan)">
      <Head title="Laporan Frekuensi Pembelian Menu" />

      <div className="space-y-6 pb-12">
        {/* HEADER & FILTER */}
        <div className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Laporan Frekuensi & Analisis Menu (Bulanan)
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Peringkat popularitas, kuantitas terjual, dan profitabilitas menu dalam satu bulan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCalendar((value) => !value)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50"
              >
                <Calendar className="h-4 w-4 text-[#8B5E3C]" />
                <span>{periodeFormatted || selectedMonth}</span>
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
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[#8B5E3C]"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* 4 KATEGORI UTAMA SUMMARY CARDS (SESUAI PERMINTAAN RAPAT) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Menu Terlaris */}
          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">1. Menu Terlaris</p>
              <h3 className="text-base font-extrabold text-emerald-600 mt-0.5">{menuTerlaris.namaMenu}</h3>
              <p className="text-xs text-gray-500 font-semibold mt-1"> {menuTerlaris.totalTerjual} Porsi Terjual</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-500"><Flame className="h-5 w-5" /></div>
          </div>

          {/* 2. Menu Kurang Diminati */}
          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">2. Kurang Diminati</p>
              <h3 className="text-base font-extrabold text-red-500 mt-0.5">{menuKurangDiminati.namaMenu}</h3>
              <p className="text-xs text-gray-500 font-semibold mt-1"> {menuKurangDiminati.totalTerjual} Porsi Terjual</p>
            </div>
            <div className="rounded-2xl bg-red-50 p-3 text-red-400"><AlertTriangle className="h-5 w-5" /></div>
          </div>

          {/* 3. Profit Tertinggi */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">3. Profit Tertinggi</p>
              <h3 className="text-base font-extrabold text-blue-600 mt-0.5">{menuProfitTertinggi.namaMenu}</h3>
              <p className="text-xs font-semibold text-emerald-600 mt-1">{formatIDR(menuProfitTertinggi.totalProfit || 0)}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600"><Award className="h-5 w-5" /></div>
          </div>

          {/* 4. Profit Terendah */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">4. Profit Terendah</p>
              <h3 className="text-base font-extrabold text-gray-700 mt-0.5">{menuProfitTerendah.namaMenu}</h3>
              <p className="text-xs font-semibold text-gray-500 mt-1">{formatIDR(menuProfitTerendah.totalProfit || 0)}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3 text-gray-500"><DollarSign className="h-5 w-5" /></div>
          </div>
        </div>

        {/* MAIN TABLE CONTAINER */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 md:flex-row md:items-center md:justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-2 text-[#8B5E3C]">
                <BarChart2 className="h-5 w-5" />
              </div>
              <h2 className="font-bold text-gray-800 text-base">
                Rincian Peringkat & Profit Menu &ndash; {periodeFormatted || selectedMonth}
              </h2>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-4 py-2 text-xs font-semibold text-gray-700 focus:bg-white focus:border-[#8B5E3C] focus:outline-none"
              />
            </div>
          </div>

          {/* TABEL */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3.5 text-center w-20">Peringkat</th>
                  <th className="px-6 py-3.5">Nama Menu</th>
                  <th className="px-6 py-3.5 text-right">Estimasi Harga</th>
                  <th className="px-6 py-3.5 text-center">Total Terjual</th>
                  <th className="px-6 py-3.5 text-right">Total Omset</th>
                  <th className="px-6 py-3.5 text-right">Total Profit</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        item.peringkat === 1 ? "bg-amber-100 text-amber-800 border border-amber-300" : "text-gray-400"
                      }`}>
                        #{item.peringkat}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{item.namaMenu}</div>
                      <div className="text-[11px] font-semibold text-gray-400">Kategori: {item.kategori}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500">{formatIDR(item.hargaSatuan)}</td>
                    <td className="px-6 py-4 text-center text-gray-900">{item.totalTerjual} porsi</td>
                    <td className="px-6 py-4 text-right text-gray-900">{formatIDR(item.totalOmset)}</td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-extrabold">{formatIDR(item.totalProfit)}</td>
                    <td className="px-6 py-4 text-center">{renderStatusBadge(item.statusPopularitas)}</td>
                  </tr>
                ))}
              </tbody>

              <tfoot className="bg-gray-50/80 font-extrabold text-gray-900 border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="px-6 py-4">Total Keseluruhan</td>
                  <td className="px-6 py-4 text-center">{totalPorsiTerjual} Porsi</td>
                  <td className="px-6 py-4 text-right text-blue-600">{formatIDR(totalOmsetKeseluruhan)}</td>
                  <td className="px-6 py-4 text-right text-emerald-600">{formatIDR(totalProfitKeseluruhan)}</td>
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