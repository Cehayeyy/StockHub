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
  ChevronLeft,
  ChevronRight,
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
  frekuensiItems: {
    data: FrekuensiItemBackend[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  ringkasan: {
    totalTerjual: number;
    totalOmset: number;
    totalProfit: number;
  };
}

export default function FrekuensiPembelian({
  selectedMonth: initialMonth,
  periodeFormatted,
  frekuensiItems,
  ringkasan,
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

  const mapBackendToUI = (items: FrekuensiItemBackend[], fromOffset: number): MenuItem[] => {
    if (!items || items.length === 0) return [];

    return items.map((item, index) => {
      const totalTerjual = Number(item.total_kuantitas) || 0;
      const totalOmset = Number(item.total_nominal) || 0;
      const totalProfit = Number(item.total_profit) || 0;
      const hargaSatuan = totalTerjual > 0 ? Math.round(totalOmset / totalTerjual) : 0;
      const peringkat = fromOffset + index;

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

  const menuList = mapBackendToUI(frekuensiItems?.data || [], frekuensiItems?.from || 1);

  const filteredItems = menuList.filter(
    (item) =>
      item.namaMenu.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const goToPage = (page: number) => {
    if (page < 1 || page > frekuensiItems.last_page || page === frekuensiItems.current_page) return;

    router.get(
        "/laporan/frekuensi-pembelian",
        { bulan: selectedMonth, page },
        { preserveState: true, preserveScroll: true, replace: true }
    );
  };

  const handleDownloadExcel = () => {
    const params = new URLSearchParams({ bulan: selectedMonth });
    window.location.href = route('laporan.frekuensi-pembelian.export') + '?' + params.toString();
  };

  const renderStatusBadge = (status: MenuItem["statusPopularitas"]) => {
    switch (status) {
      case "Sangat Laku":
        return <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-wide font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 shadow-xs">Sangat Laku</span>;
      case "Laku":
        return <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-wide font-bold bg-emerald-50 dark:bg-[#16321F] text-emerald-600 dark:text-[#4ADE80] border border-emerald-100 dark:border-[#245233] shadow-xs">Laku</span>;
      case "Stabil":
        return <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-wide font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 shadow-xs">Stabil</span>;
      case "Perlu Evaluasi":
        return <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-wide font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50 shadow-xs">Perlu Evaluasi</span>;
      case "Kurang Diminati":
        return <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-wide font-bold bg-red-50 dark:bg-rose-900/30 text-red-600 dark:text-rose-400 border border-red-100 dark:border-rose-800/50 shadow-xs">Kurang Diminati</span>;
      default:
        return null;
    }
  };

  return (
    <AppLayout header="Laporan Frekuensi Pembelian Menu (Bulanan)">
      <Head title="Laporan Frekuensi Pembelian Menu" />

      {/* 🔥 STRUKTUR CONTAINER UTAMA: KREM LUAR, PUTIH DALAM (STANDAR ENTERPRISE) 🔥 */}
      <div className="py-6 space-y-6">
        <div className="rounded-3xl bg-[#F2ECE4] dark:bg-[#2A221C] p-4 md:p-8 shadow-sm border border-amber-200/60 dark:border-[#45372C]">
          <div className="rounded-3xl bg-white dark:bg-[#231C17] p-4 md:p-6 shadow-xs border border-gray-100 dark:border-[#3D3127] min-h-[600px] flex flex-col">

            {/* 1. HEADER TITLE & ACTION BAR */}
            <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-gray-100 dark:border-[#3D3127] pb-5 xl:border-b-0 xl:pb-0">
              <div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-[#FAF5ED]">Laporan Frekuensi & Analisis Menu</h1>
                <p className="text-xs text-gray-500 dark:text-[#A89B8C] mt-0.5">
                  Peringkat popularitas, kuantitas terjual, dan profitabilitas menu dalam satu bulan.
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
                      <span>{periodeFormatted || selectedMonth}</span>
                    </div>
                  </button>

                  {showCalendar && (
                    <div className="absolute right-0 mt-2 rounded-3xl bg-white dark:bg-[#2A221C] p-4 shadow-2xl z-30 w-64 border border-gray-100 dark:border-[#45372C] animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-gray-700 dark:text-[#FAF5ED] uppercase tracking-wider">Filter Periode</span>
                      </div>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        className="w-full rounded-2xl border border-gray-200 dark:border-[#45372C] bg-gray-50 dark:bg-[#1E1915] text-gray-800 dark:text-[#FAF5ED] px-3.5 py-2 text-sm font-medium focus:ring-2 focus:ring-[#8B5E3C] outline-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Tombol Export Excel */}
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  className="flex items-center justify-center gap-2 rounded-full bg-[#8B5E3C] hover:bg-[#6F4E37] px-5 py-2.5 sm:py-2 text-sm font-bold text-white shadow-md transition w-full sm:w-auto active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Excel</span>
                </button>
              </div>
            </div>

            {/* 2. 4 KATEGORI UTAMA SUMMARY CARDS (Hanya tampil di Halaman 1) */}
            {frekuensiItems.current_page === 1 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                {/* Menu Terlaris */}
                <div className="rounded-2xl border border-gray-100 dark:border-[#3D3127] bg-gray-50 dark:bg-[#1E1915] p-5 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#8E8072]">1. Menu Terlaris</p>
                    <h3 className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{menuTerlaris.namaMenu}</h3>
                    <p className="text-xs text-gray-500 dark:text-[#A89B8C] font-semibold mt-1"> {menuTerlaris.totalTerjual} Porsi Terjual</p>
                  </div>
                  <div className="rounded-2xl bg-amber-100 dark:bg-amber-900/40 p-3 text-amber-500 dark:text-amber-400 shadow-inner"><Flame className="h-5 w-5" /></div>
                </div>

                {/* Menu Kurang Diminati */}
                <div className="rounded-2xl border border-gray-100 dark:border-[#3D3127] bg-gray-50 dark:bg-[#1E1915] p-5 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#8E8072]">2. Kurang Diminati</p>
                    <h3 className="text-base font-extrabold text-red-500 dark:text-rose-400 mt-0.5">{menuKurangDiminati.namaMenu}</h3>
                    <p className="text-xs text-gray-500 dark:text-[#A89B8C] font-semibold mt-1"> {menuKurangDiminati.totalTerjual} Porsi Terjual</p>
                  </div>
                  <div className="rounded-2xl bg-red-100 dark:bg-rose-900/40 p-3 text-red-500 dark:text-rose-400 shadow-inner"><AlertTriangle className="h-5 w-5" /></div>
                </div>

                {/* Profit Tertinggi */}
                <div className="rounded-2xl border border-gray-100 dark:border-[#3D3127] bg-gray-50 dark:bg-[#1E1915] p-5 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#8E8072]">3. Profit Tertinggi</p>
                    <h3 className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{menuProfitTertinggi.namaMenu}</h3>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500 mt-1">{formatIDR(menuProfitTertinggi.totalProfit || 0)}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 p-3 text-emerald-600 dark:text-emerald-400 shadow-inner"><Award className="h-5 w-5" /></div>
                </div>

                {/* Profit Terendah */}
                <div className="rounded-2xl border border-gray-100 dark:border-[#3D3127] bg-gray-50 dark:bg-[#1E1915] p-5 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#8E8072]">4. Profit Terendah</p>
                    <h3 className="text-base font-extrabold text-gray-700 dark:text-[#FAF5ED] mt-0.5">{menuProfitTerendah.namaMenu}</h3>
                    <p className="text-xs font-semibold text-gray-500 dark:text-[#A89B8C] mt-1">{formatIDR(menuProfitTerendah.totalProfit || 0)}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-200/50 dark:bg-[#3A2E26] p-3 text-gray-600 dark:text-[#E5D8C9] shadow-inner"><DollarSign className="h-5 w-5" /></div>
                </div>
              </div>
            )}

            {/* 3. SUBHEADER & PENCARIAN TABEL */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-gray-800 dark:text-[#FAF5ED]">Rincian Peringkat Menu</h2>
                  <span className="bg-[#FDF3E4] dark:bg-[#3E3024] text-[#8B5E3C] dark:text-amber-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border border-amber-100 dark:border-amber-800/40 shadow-xs">
                      {frekuensiItems.total} Menu Terjual
                  </span>
              </div>

              <div className="relative w-full sm:w-64">
                  <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama menu..."
                      className="w-full rounded-full border border-gray-200 dark:border-[#45372C] bg-gray-50 dark:bg-[#231C17] text-gray-800 dark:text-[#FAF5ED] px-4 py-2.5 sm:py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#8E8072] pointer-events-none" />
              </div>
            </div>

            {/* 4. MAIN TABLE */}
            <div className="w-full rounded-2xl border border-gray-100 dark:border-[#3D3127] bg-white dark:bg-[#231C17] shadow-sm overflow-hidden flex-1 mb-6">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#FAF7F2]/80 dark:bg-[#1E1915] text-gray-500 dark:text-[#A89B8C] font-bold uppercase tracking-wider text-[11px] border-b border-gray-100 dark:border-[#3D3127]">
                    <tr>
                      <th className="px-6 py-4 text-center w-20">Peringkat</th>
                      <th className="px-6 py-4">Nama Menu</th>
                      <th className="px-6 py-4 text-right">Estimasi Harga</th>
                      <th className="px-6 py-4 text-center">Total Terjual</th>
                      <th className="px-6 py-4 text-right">Total Omset</th>
                      <th className="px-6 py-4 text-right">Total Profit</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-[#3D3127]">
                    {filteredItems.length > 0 ? (
                        filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-[#FDF3E4]/50 dark:hover:bg-[#2A221C]/60 transition-colors duration-150">
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold shadow-xs ${
                                  item.peringkat === 1 ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700" : "bg-gray-100 dark:bg-[#35291F] text-gray-500 dark:text-[#C8BCAE] border border-gray-200 dark:border-[#45372C]"
                              }`}>
                                  #{item.peringkat}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-gray-800 dark:text-[#FAF5ED]">{item.namaMenu}</div>
                              <div className="text-[11px] font-medium text-gray-400 dark:text-[#8E8072] mt-0.5">Kategori: {item.kategori}</div>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-600 dark:text-[#A89B8C] font-medium">{formatIDR(item.hargaSatuan)}</td>
                            <td className="px-6 py-4 text-center font-bold text-gray-800 dark:text-[#FAF5ED]">{item.totalTerjual} porsi</td>
                            <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-[#FAF5ED]">{formatIDR(item.totalOmset)}</td>
                            <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400 font-black">{formatIDR(item.totalProfit)}</td>
                            <td className="px-6 py-4 text-center">{renderStatusBadge(item.statusPopularitas)}</td>
                        </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={7} className="py-12 text-center text-gray-400 dark:text-[#8E8072] italic">
                                Belum ada data menu pada bulan ini.
                            </td>
                        </tr>
                    )}
                  </tbody>

                  <tfoot className="bg-[#FAF7F2] dark:bg-[#1E1915] font-extrabold text-gray-800 dark:text-[#FAF5ED] border-t border-gray-200 dark:border-[#3D3127]">
                    {frekuensiItems?.current_page === frekuensiItems?.last_page && (
                        <tr>
                            <td colSpan={3} className="px-6 py-4 text-right uppercase tracking-wider text-[11px]">Total Keseluruhan</td>
                            <td className="px-6 py-4 text-center">{ringkasan?.totalTerjual || 0} Porsi</td>
                            <td className="px-6 py-4 text-right text-blue-600 dark:text-blue-400">{formatIDR(ringkasan?.totalOmset || 0)}</td>
                            <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400">{formatIDR(ringkasan?.totalProfit || 0)}</td>
                            <td></td>
                        </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 5. PAGINATION (GAYA MODERN PILL) */}
            <div className="mt-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs sm:text-sm text-gray-500 dark:text-[#A89B8C]">
                <div>
                  {frekuensiItems?.total && frekuensiItems.total > 0 ? (
                      <span>
                          Menampilkan {frekuensiItems.from ?? 1}–{frekuensiItems.to ?? frekuensiItems.data.length} dari {frekuensiItems.total} menu
                      </span>
                  ) : (
                      <span>Tidak ada menu</span>
                  )}
                </div>

                {frekuensiItems?.last_page > 1 && (
                  <div className="flex items-center gap-1.5 self-center sm:self-auto bg-gray-50 dark:bg-[#231C17] p-1 rounded-full border border-gray-200 dark:border-[#3D3127]">
                      <button
                          type="button"
                          onClick={() => goToPage(frekuensiItems.current_page - 1)}
                          disabled={frekuensiItems.current_page === 1}
                          className={`relative inline-flex items-center px-2 py-2 text-xs font-medium transition-all rounded-full ${
                              frekuensiItems.current_page === 1 ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-[#8E8072]' : 'text-gray-600 dark:text-[#C8BCAE] hover:bg-white dark:hover:bg-[#2A221C] hover:text-[#8B5E3C] dark:hover:text-amber-300'
                          }`}
                      >
                          <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      {Array.from({ length: frekuensiItems.last_page }, (_, index) => index + 1).map((page) => (
                          <button
                              key={page}
                              type="button"
                              onClick={() => goToPage(page)}
                              className={`relative inline-flex items-center justify-center w-8 h-8 text-xs font-bold transition-all rounded-full ${
                                  page === frekuensiItems.current_page
                                      ? 'bg-[#8B5E3C] text-white shadow-md'
                                      : 'text-gray-600 dark:text-[#C8BCAE] hover:bg-white dark:hover:bg-[#2A221C] hover:text-[#8B5E3C] dark:hover:text-amber-300'
                              }`}
                          >
                              {page}
                          </button>
                      ))}

                      <button
                          type="button"
                          onClick={() => goToPage(frekuensiItems.current_page + 1)}
                          disabled={frekuensiItems.current_page === frekuensiItems.last_page}
                          className={`relative inline-flex items-center px-2 py-2 text-xs font-medium transition-all rounded-full ${
                              frekuensiItems.current_page === frekuensiItems.last_page ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-[#8E8072]' : 'text-gray-600 dark:text-[#C8BCAE] hover:bg-white dark:hover:bg-[#2A221C] hover:text-[#8B5E3C] dark:hover:text-amber-300'
                          }`}
                      >
                          <ChevronRight className="w-4 h-4" />
                      </button>
                  </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}