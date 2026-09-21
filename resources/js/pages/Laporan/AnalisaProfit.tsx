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

    // Hitung total keseluruhan untuk footer tabel
    const totalTerjualCount = itemsAnalisa.data.reduce((acc, curr) => acc + curr.terjual, 0);
    const totalHppSum = itemsAnalisa.data.reduce((acc, curr) => acc + curr.total_hpp, 0);
    const totalProfitSum = itemsAnalisa.data.reduce((acc, curr) => acc + curr.total_profit_real, 0);

    return (
        <AppLayout header="Analisis Profit Harian per Menu">
            <Head title="Analisis Profit Harian per Menu" />

            <div className="py-6 space-y-6">
                
                {/* HEADER TITLE & ACTION BAR */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-3xl shadow-xs border border-gray-100">
                    <div>
                        <h1 className="text-xl font-black text-gray-800">Analisis Profit Harian per Menu</h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Rekapitulasi data aktual transaksi penjualan menu, realisasi HPP, dan margin keuntungan harian kasir.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Tab Periode: Harian, Mingguan, Bulanan */}
                        <div className="flex bg-[#FAF7F2] p-1 rounded-2xl border border-gray-200">
                            {['Harian', 'Mingguan', 'Bulanan'].map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => setPeriode(item)}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                                        periode === item ? 'bg-[#8B5E3C] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>

                        {/* Date Picker (Diselaraskan dengan Laporan Aktivitas) */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowCalendar((v) => !v)}
                                className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition-all"
                            >
                                <Calendar className="h-4 w-4 text-[#8B5E3C]" />
                                <span>{displayFilterDate}</span>
                            </button>

                            {showCalendar && (
                                <div className="absolute right-0 mt-2 rounded-3xl bg-white p-4 shadow-2xl z-20 w-64 border border-gray-100 animate-in fade-in zoom-in-95">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Filter Tanggal</span>
                                    </div>
                                    <input
                                        type="date"
                                        value={tanggal}
                                        onChange={(e) => {
                                            setTanggal(e.target.value);
                                            setShowCalendar(false);
                                        }}
                                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm font-medium focus:ring-2 focus:ring-[#8B5E3C] outline-none cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Tombol Export Excel / PDF (Diselaraskan) */}
                        <button
                            type="button"
                            onClick={handleDownloadExcel}
                            className="inline-flex items-center gap-2 rounded-full bg-[#D9A978] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#c4925e] transition-all"
                        >
                            <Download className="h-4 w-4" />
                            <span>Export Excel / PDF</span>
                        </button>
                    </div>
                </div>

                {/* 1. 2 KARTU RINGKASAN UTAMA (SUMMARY CARDS SESUAI UI KLIEN) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Total Omset Real / Gross */}
                    <div className="bg-white p-6 rounded-3xl shadow-xs border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">TOTAL OMSET REAL / NET</p>
                            <p className="text-2xl font-black text-gray-800 mt-1">
                                {formatRupiah(ringkasan?.totalOmsetReal || 0)}
                            </p>
                            <p className="text-[11px] font-medium text-gray-400 mt-1">Setelah diskon dan fee mitra</p>
                        </div>
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <DollarSign size={28} />
                        </div>
                    </div>

                    {/* Total Profit Real */}
                    <div className="bg-white p-6 rounded-3xl shadow-xs border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">TOTAL PROFIT REAL</p>
                            <p className="text-2xl font-black text-emerald-600 mt-1">
                                {formatRupiah(ringkasan?.totalProfitReal || 0)}
                            </p>
                            <p className="text-[11px] font-medium text-gray-400 mt-1">Keuntungan bersih aktual kasir</p>
                        </div>
                        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <TrendingUp size={28} />
                        </div>
                    </div>

                </div>

                {/* 2. KONTAINER UTAMA TABEL ANALISA */}
                <div className="bg-[#F2ECE4] p-4 md:p-6 rounded-3xl shadow-sm border border-amber-200/60 flex flex-col">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                        <div className="flex items-center gap-3">
                            <h2 className="text-base font-bold text-gray-800">Rincian Analisis Profit Menu</h2>
                            <span className="bg-[#8B5E3C]/10 text-[#8B5E3C] px-3 py-1 rounded-full text-xs font-bold">
                                {itemsAnalisa.total} Menu Terdaftar
                            </span>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full sm:w-72">
                            <input 
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari resep menu..."
                                className="w-full rounded-2xl border border-gray-200 bg-white pl-4 pr-10 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
                            />
                            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Tabel Analisa */}
                    <div className="w-full rounded-2xl border border-gray-100 bg-white shadow-xs overflow-hidden mb-4">
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead className="bg-[#FAF7F2] text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                                    <tr>
                                        <th className="py-4 px-5 text-center w-12">No</th>
                                        <th className="py-4 px-5">Nama Menu</th>
                                        <th className="py-4 px-5 text-center w-28">Kategori</th>
                                        <th className="py-4 px-5 text-center w-24">Terjual</th>
                                        <th className="py-4 px-5 text-right w-32">Total HPP</th>
                                        <th className="py-4 px-5 text-right w-36">Harga Jual Riil (Net)</th>
                                        <th className="py-4 px-5 text-right w-36">Profit Riil (Satuan)</th>
                                        <th className="py-4 px-5 text-right w-36">Total Profit Real</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {itemsAnalisa.data.length > 0 ? (
                                        itemsAnalisa.data.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-[#FDF3E4]/50 transition-colors">
                                                <td className="py-3.5 px-5 text-center text-gray-400 font-medium">{(itemsAnalisa.from || 1) + index}</td>
                                                <td className="py-3.5 px-5 font-bold text-gray-800">{item.nama}</td>
                                                <td className="py-3.5 px-5 text-center">
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                                                        {item.kategori || 'Menu'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-5 text-center font-bold text-gray-700">{item.terjual} porsi</td>
                                                <td className="py-3.5 px-5 text-right font-medium text-gray-600">{formatRupiah(item.total_hpp)}</td>
                                                <td className="py-3.5 px-5 text-right font-bold text-gray-800">{formatRupiah(item.harga_jual_riil)}</td>
                                                <td className="py-3.5 px-5 text-right font-medium text-emerald-600">{formatRupiah(item.profit_riil_satuan)}</td>
                                                <td className="py-3.5 px-5 text-right font-black text-emerald-600">{formatRupiah(item.total_profit_real)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                                                Belum ada data analisis profit pada periode ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {/* Footer Baris Total Keseluruhan */}
                                <tfoot className="bg-[#FAF7F2] font-extrabold text-gray-800 border-t border-gray-200">
                                    <tr>
                                        <td colSpan={3} className="py-3.5 px-5 text-right uppercase tracking-wider text-[11px]">Total Keseluruhan</td>
                                        <td className="py-3.5 px-5 text-center">{totalTerjualCount} porsi</td>
                                        <td className="py-3.5 px-5 text-right">{formatRupiah(totalHppSum)}</td>
                                        <td className="py-3.5 px-5 text-right">-</td>
                                        <td className="py-3.5 px-5 text-right">-</td>
                                        <td className="py-3.5 px-5 text-right text-emerald-600 font-black">{formatRupiah(totalProfitSum)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Pagination Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 px-2 gap-3">
                        <span>Menampilkan {itemsAnalisa.from || 0}-{itemsAnalisa.to || 0} dari {itemsAnalisa.total} menu resep</span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => goToPage(itemsAnalisa.current_page - 1)}
                                disabled={itemsAnalisa.current_page === 1}
                                className="p-1.5 rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-50"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {Array.from({ length: itemsAnalisa.last_page }, (_, index) => index + 1).map((page) => (
                                <button
                                    key={page}
                                    type="button"
                                    onClick={() => goToPage(page)}
                                    className={`px-3 py-1 rounded-xl font-bold shadow-xs ${
                                        page === itemsAnalisa.current_page
                                            ? 'bg-[#8B5E3C] text-white'
                                            : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => goToPage(itemsAnalisa.current_page + 1)}
                                disabled={itemsAnalisa.current_page === itemsAnalisa.last_page}
                                className="p-1.5 rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-50"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        </AppLayout>
    );
}