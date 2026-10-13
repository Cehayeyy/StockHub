import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from "@/layouts/app-layout";
import { TrendingUp, DollarSign, Download, Calendar, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface ItemAnalisa {
    id: number;
    nama: string;
    kategori: string;
    terjual: number;
    total_hpp: number;
    harga_jual_riil: number;
    profit_riil_satuan: number;
    total_profit_real: number;
}

interface Props {
    ringkasan: {
        totalOmsetReal: number;
        totalProfitReal: number;
        totalTerjual: number;
        totalHpp: number;
    };
    itemsAnalisa: {
        data: ItemAnalisa[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters?: {
        search?: string;
        periode?: string;
        tanggal?: string;
    };
}

export default function AnalisaProfit({ ringkasan, itemsAnalisa, filters }: Props) {
    const [search, setSearch] = useState(filters?.search || '');
    const [periode, setPeriode] = useState(filters?.periode || 'Harian');
    const [tanggal, setTanggal] = useState(filters?.tanggal || new Date().toISOString().split('T')[0]);
    const [showCalendar, setShowCalendar] = useState(false);

    // Debounced Filter Handler
    useEffect(() => {
        const timer = setTimeout(() => {
            router.get(
                route('laporan.analisa-profit'),
                { search, periode, tanggal },
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [search, periode, tanggal]);

    const formatRupiah = (angka: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
    };

    const handleDownloadExcel = () => {
        const params = new URLSearchParams({ search, periode, tanggal });
        window.location.href = route('laporan.analisa-profit.export') + '?' + params.toString();
    };

    const goToPage = (page: number) => {
        if (page < 1 || page > itemsAnalisa.last_page || page === itemsAnalisa.current_page) return;

        router.get(
            route('laporan.analisa-profit'),
            { search, periode, tanggal, page },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const displayFilterDate = tanggal
        ? new Date(tanggal).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : 'Pilih tanggal';

    return (
        <AppLayout header="Analisis Profit Harian per Menu">
            <Head title="Analisis Profit Harian per Menu" />

            {/* 🔥 STRUKTUR CONTAINER UTAMA: KREM LUAR, PUTIH DALAM 🔥 */}
            <div className="py-6 space-y-6">
                <div className="rounded-3xl bg-[#F2ECE4] dark:bg-[#2A221C] p-4 md:p-8 shadow-sm border border-amber-200/60 dark:border-[#45372C]">
                    <div className="rounded-3xl bg-white dark:bg-[#231C17] p-4 md:p-6 shadow-xs border border-gray-100 dark:border-[#3D3127] min-h-[600px] flex flex-col">
                        
                        {/* 1. HEADER TITLE & ACTION BAR */}
                        <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-gray-100 dark:border-[#3D3127] pb-5 xl:border-b-0 xl:pb-0">
                            <div>
                                <h1 className="text-lg font-bold text-gray-800 dark:text-[#FAF5ED]">Analisis Profit per Menu</h1>
                                <p className="text-xs text-gray-500 dark:text-[#A89B8C] mt-0.5">
                                    Rekapitulasi data aktual transaksi penjualan menu, realisasi HPP, dan margin keuntungan.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
                                
                                {/* Tab Periode: Harian, Mingguan, Bulanan */}
                                <div className="flex w-full sm:w-auto bg-[#FAF7F2] dark:bg-[#231C17] rounded-full p-1 border border-amber-100 dark:border-[#45372C]">
                                    {['Harian', 'Mingguan', 'Bulanan'].map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setPeriode(item)}
                                            className={`flex-1 sm:flex-none px-5 py-2 text-xs font-bold rounded-full transition-all ${
                                                periode === item 
                                                  ? 'bg-[#8B5E3C] text-white shadow-xs' 
                                                  : 'text-gray-600 dark:text-[#C8BCAE] hover:text-[#8B5E3C] dark:hover:text-amber-300 hover:bg-white/60 dark:hover:bg-[#2A221C]'
                                            }`}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>

                                {/* Date Picker Custom */}
                                <div className="relative w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setShowCalendar((v) => !v)}
                                        className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-center gap-2 rounded-full bg-gray-50 dark:bg-[#231C17] border border-gray-200 dark:border-[#45372C] px-5 py-2.5 sm:py-2 text-sm font-bold text-[#8B5E3C] dark:text-amber-400 shadow-2xs hover:bg-gray-100 dark:hover:bg-[#35291F] transition-all outline-none focus:ring-2 focus:ring-[#D9A978]"
                                    >
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4" />
                                          <span>{displayFilterDate}</span>
                                        </div>
                                    </button>

                                    {showCalendar && (
                                        <div className="absolute right-0 mt-2 rounded-3xl bg-white dark:bg-[#2A221C] p-4 shadow-2xl z-30 w-64 border border-gray-100 dark:border-[#45372C] animate-in fade-in zoom-in-95">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-bold text-gray-700 dark:text-[#FAF5ED] uppercase tracking-wider">Filter Tanggal</span>
                                            </div>
                                            <input
                                                type="date"
                                                value={tanggal}
                                                style={{ colorScheme: 'dark' }}
                                                onChange={(e) => {
                                                    setTanggal(e.target.value);
                                                    setShowCalendar(false);
                                                }}
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

                        {/* 2. SUMMARY CARDS (Dibuat Kontras di dalam Kotak Putih) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            {/* Total Omset Real */}
                            <div className="bg-gray-50 dark:bg-[#1E1915] p-5 rounded-2xl border border-gray-100 dark:border-[#3D3127] flex items-center justify-between shadow-xs">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-[#8E8072] uppercase tracking-wider">Total Omset Real / Net</p>
                                    <p className="text-2xl font-black text-gray-800 dark:text-[#FAF5ED] mt-1">
                                        {formatRupiah(ringkasan?.totalOmsetReal || 0)}
                                    </p>
                                    <p className="text-[11px] font-medium text-gray-400 dark:text-[#8E8072] mt-1">Setelah diskon dan fee mitra</p>
                                </div>
                                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner">
                                    <DollarSign size={28} />
                                </div>
                            </div>

                            {/* Total Profit Real */}
                            <div className="bg-gray-50 dark:bg-[#1E1915] p-5 rounded-2xl border border-gray-100 dark:border-[#3D3127] flex items-center justify-between shadow-xs">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-[#8E8072] uppercase tracking-wider">Total Profit Real</p>
                                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                        {formatRupiah(ringkasan?.totalProfitReal || 0)}
                                    </p>
                                    <p className="text-[11px] font-medium text-gray-400 dark:text-[#8E8072] mt-1">Keuntungan bersih aktual kasir</p>
                                </div>
                                <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shadow-inner">
                                    <TrendingUp size={28} />
                                </div>
                            </div>
                        </div>

                        {/* 3. SUBHEADER & PENCARIAN TABEL */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                            <div className="flex items-center gap-3">
                                <h2 className="text-base font-bold text-gray-800 dark:text-[#FAF5ED]">Rincian Analisis Profit Menu</h2>
                                <span className="bg-[#FDF3E4] dark:bg-[#3E3024] text-[#8B5E3C] dark:text-amber-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border border-amber-100 dark:border-amber-800/40 shadow-xs">
                                    {itemsAnalisa.total} Terdaftar
                                </span>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <input 
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari menu..."
                                    className="w-full rounded-full border border-gray-200 dark:border-[#45372C] bg-gray-50 dark:bg-[#231C17] text-gray-800 dark:text-[#FAF5ED] px-4 py-2.5 sm:py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                                />
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#8E8072] pointer-events-none" />
                            </div>
                        </div>

                        {/* 4. TABEL ANALISA */}
                        <div className="w-full rounded-2xl border border-gray-100 dark:border-[#3D3127] bg-white dark:bg-[#231C17] shadow-sm overflow-hidden flex-1 mb-6">
                            <div className="w-full overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-[#FAF7F2]/80 dark:bg-[#1E1915] text-gray-500 dark:text-[#A89B8C] font-bold uppercase tracking-wider text-[11px] border-b border-gray-100 dark:border-[#3D3127]">
                                        <tr>
                                            <th className="py-4 px-6 text-center w-16">No</th>
                                            <th className="py-4 px-6">Nama Menu</th>
                                            <th className="py-4 px-6 text-center w-32">Kategori</th>
                                            <th className="py-4 px-6 text-center w-28">Terjual</th>
                                            <th className="py-4 px-6 text-right w-36">Total HPP</th>
                                            <th className="py-4 px-6 text-right w-44">Harga Jual Riil (Net)</th>
                                            <th className="py-4 px-6 text-right w-40">Profit Riil (Satuan)</th>
                                            <th className="py-4 px-6 text-right w-40">Total Profit Real</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-[#3D3127]">
                                        {itemsAnalisa.data.length > 0 ? (
                                            itemsAnalisa.data.map((item, index) => (
                                                <tr key={item.id} className="hover:bg-[#FDF3E4]/50 dark:hover:bg-[#2A221C]/60 transition-colors duration-150">
                                                    <td className="py-4 px-6 text-center text-gray-400 dark:text-[#8E8072] font-medium">{(itemsAnalisa.from || 1) + index}</td>
                                                    <td className="py-4 px-6 font-bold text-gray-800 dark:text-[#FAF5ED]">{item.nama}</td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide border border-amber-100 dark:border-amber-800/40 shadow-xs bg-[#FDF3E4] dark:bg-[#3E3024] text-[#8B5E3C] dark:text-amber-300">
                                                            {item.kategori || 'Menu'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-center font-bold text-gray-700 dark:text-[#C8BCAE]">{item.terjual} porsi</td>
                                                    <td className="py-4 px-6 text-right font-medium text-gray-600 dark:text-[#A89B8C]">{formatRupiah(item.total_hpp)}</td>
                                                    <td className="py-4 px-6 text-right font-bold text-gray-800 dark:text-[#FAF5ED]">{formatRupiah(item.harga_jual_riil)}</td>
                                                    <td className="py-4 px-6 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(item.profit_riil_satuan)}</td>
                                                    <td className="py-4 px-6 text-right font-black text-emerald-600 dark:text-emerald-400">{formatRupiah(item.total_profit_real)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={8} className="py-12 text-center text-gray-400 dark:text-[#8E8072] italic">
                                                    Belum ada data analisis profit pada periode ini.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>

                                    <tfoot className="bg-[#FAF7F2] dark:bg-[#1E1915] font-extrabold text-gray-800 dark:text-[#FAF5ED] border-t border-gray-200 dark:border-[#3D3127]">
                                        {/* HANYA MUNCUL DI HALAMAN TERAKHIR */}
                                        {itemsAnalisa.current_page === itemsAnalisa.last_page && (
                                            <tr>
                                                <td colSpan={3} className="py-4 px-6 text-right uppercase tracking-wider text-[11px]">Total Keseluruhan</td>
                                                <td className="py-4 px-6 text-center">{ringkasan.totalTerjual || 0} porsi</td>
                                                <td className="py-4 px-6 text-right">{formatRupiah(ringkasan.totalHpp || 0)}</td>
                                                <td className="py-4 px-6 text-right">-</td>
                                                <td className="py-4 px-6 text-right">-</td>
                                                <td className="py-4 px-6 text-right text-emerald-600 dark:text-emerald-400 font-black">{formatRupiah(ringkasan.totalProfitReal || 0)}</td>
                                            </tr>
                                        )}
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* 5. PAGINATION (GAYA MODERN PILL) */}
                        <div className="mt-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs sm:text-sm text-gray-500 dark:text-[#A89B8C]">
                            <div>
                                {itemsAnalisa.total && itemsAnalisa.total > 0 ? (
                                    <span>
                                        Menampilkan {itemsAnalisa.from ?? 1}–{itemsAnalisa.to ?? itemsAnalisa.data.length} dari {itemsAnalisa.total} menu
                                    </span>
                                ) : (
                                    <span>Tidak ada menu</span>
                                )}
                            </div>

                            {itemsAnalisa.last_page > 1 && (
                                <div className="flex items-center gap-1.5 self-center sm:self-auto bg-gray-50 dark:bg-[#231C17] p-1 rounded-full border border-gray-200 dark:border-[#3D3127]">
                                    <button
                                        type="button"
                                        onClick={() => goToPage(itemsAnalisa.current_page - 1)}
                                        disabled={itemsAnalisa.current_page === 1}
                                        className={`relative inline-flex items-center px-2 py-2 text-xs font-medium transition-all rounded-full ${
                                            itemsAnalisa.current_page === 1 ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-[#8E8072]' : 'text-gray-600 dark:text-[#C8BCAE] hover:bg-white dark:hover:bg-[#2A221C] hover:text-[#8B5E3C] dark:hover:text-amber-300'
                                        }`}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    
                                    {Array.from({ length: itemsAnalisa.last_page }, (_, index) => index + 1).map((page) => (
                                        <button
                                            key={page}
                                            type="button"
                                            onClick={() => goToPage(page)}
                                            className={`relative inline-flex items-center justify-center w-8 h-8 text-xs font-bold transition-all rounded-full ${
                                                page === itemsAnalisa.current_page
                                                    ? 'bg-[#8B5E3C] text-white shadow-md'
                                                    : 'text-gray-600 dark:text-[#C8BCAE] hover:bg-white dark:hover:bg-[#2A221C] hover:text-[#8B5E3C] dark:hover:text-amber-300'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => goToPage(itemsAnalisa.current_page + 1)}
                                        disabled={itemsAnalisa.current_page === itemsAnalisa.last_page}
                                        className={`relative inline-flex items-center px-2 py-2 text-xs font-medium transition-all rounded-full ${
                                            itemsAnalisa.current_page === itemsAnalisa.last_page ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-[#8E8072]' : 'text-gray-600 dark:text-[#C8BCAE] hover:bg-white dark:hover:bg-[#2A221C] hover:text-[#8B5E3C] dark:hover:text-amber-300'
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