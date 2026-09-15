import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from "@/layouts/app-layout";
import { CheckCircle, XCircle, Download, Calendar, Search } from "lucide-react";

interface Laporan {
    id: number;
    created_at: string;
    item: { nama: string; satuan: string };
    staff: { name: string; username?: string; role?: string };
    kuantitas: string;
    alasan: string;
    status: 'Menunggu Verifikasi' | 'Disetujui' | 'Ditolak';
}

interface Paginator<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
}

interface Props {
    laporan: Paginator<Laporan>;
    filters?: {
        search?: string;
        tanggal?: string;
    };
}

export default function VerifikasiKerugian({ laporan, filters }: Props) {
    const [search, setSearch] = useState(filters?.search || '');
    const [tanggal, setTanggal] = useState(filters?.tanggal || '');
    const [showCalendar, setShowCalendar] = useState(false);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        id: number | null;
        action: 'approve' | 'reject' | null;
        itemName: string;
    }>({
        isOpen: false,
        id: null,
        action: null,
        itemName: '',
    });

    // Debounced search & filter handler
    useEffect(() => {
        const timer = setTimeout(() => {
            router.get(
                route('verifikasi-kerugian.index'),
                { search, tanggal },
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [search, tanggal]);

    // Keyboard Shortcuts: Enter untuk Approve/Eksekusi, Esc untuk Batal/Tutup Modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!confirmModal.isOpen) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                handleExecuteAction();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setConfirmModal({ isOpen: false, id: null, action: null, itemName: '' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmModal]);

    const openConfirmModal = (id: number, action: 'approve' | 'reject', itemName: string) => {
        setConfirmModal({ isOpen: true, id, action, itemName });
    };

    const handleExecuteAction = () => {
        if (!confirmModal.id || !confirmModal.action) return;

        router.put(route('verifikasi-kerugian.update', confirmModal.id), { action: confirmModal.action }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setConfirmModal({ isOpen: false, id: null, action: null, itemName: '' });
            },
        });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const displayFilterDate = tanggal 
        ? new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'Pilih Tanggal';

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Disetujui': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'Ditolak': return 'bg-rose-50 text-rose-700 border-rose-100';
            default: return 'bg-amber-50 text-amber-700 border-amber-100';
        }
    };

    return (
        <AppLayout header="Verifikasi Laporan Kerugian">
            <Head title="Verifikasi Laporan Kerugian" />

            <div className="py-6">
                <div className="bg-[#F2ECE4] p-4 md:p-8 rounded-3xl shadow-sm border border-amber-200/60 min-h-[600px] flex flex-col justify-between">
                    
                    <div>
                        {/* Action Bar */}
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 pb-5 border-b border-gray-200/60 gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">Verifikasi Laporan Kerugian Bahan Baku</h2>
                                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Periksa dan setujui laporan kerugian harian dari staf bar maupun dapur.</p>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                {/* Tombol Unduh .xls */}
                                <a
                                    href={route('verifikasi-kerugian.export')}
                                    className="inline-flex justify-center items-center gap-2 rounded-full bg-[#D9A978] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#c4925e] transition-all"
                                >
                                    <Download className="h-4 w-4" />
                                    <span>Unduh .xls</span>
                                </a>

                                {/* Date Picker Dropdown */}
                                <div className="relative w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setShowCalendar((v) => !v)}
                                        className="inline-flex justify-between sm:justify-center items-center gap-2 rounded-full bg-white border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition-all w-full sm:w-auto"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-[#8B5E3C]" />
                                            <span>{displayFilterDate}</span>
                                        </div>
                                    </button>

                                    {showCalendar && (
                                        <div className="absolute right-0 mt-2 rounded-3xl bg-white p-4 shadow-2xl z-20 w-full sm:w-64 border border-gray-100 animate-in fade-in zoom-in-95">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Filter Tanggal</span>
                                                {tanggal && (
                                                    <button 
                                                        onClick={() => { setTanggal(''); setShowCalendar(false); }}
                                                        className="text-xs text-[#8B5E3C] hover:underline font-bold"
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                type="date"
                                                value={tanggal}
                                                onChange={(e) => {
                                                    setTanggal(e.target.value);
                                                    setShowCalendar(false);
                                                }}
                                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm font-medium focus:ring-2 focus:ring-[#8B5E3C] outline-none"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Search Bar */}
                                <div className="relative flex-1 sm:w-64">
                                    <input 
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Cari bahan/pelapor..."
                                        className="w-full sm:w-64 rounded-full border border-gray-200 bg-gray-50 pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                                    />
                                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Tabel Data */}
                        <div className="w-full rounded-2xl border border-gray-100 bg-white shadow-xs overflow-hidden mb-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-[#FAF7F2]/80 text-gray-500 font-bold uppercase text-[11px] tracking-wider border-b border-gray-100">
                                        <tr>
                                            <th className="py-4 px-6 text-center w-16">No</th>
                                            <th className="py-4 px-6">Tanggal</th>
                                            <th className="py-4 px-6">Nama Bahan Baku</th>
                                            <th className="py-4 px-6">Kuantitas</th>
                                            <th className="py-4 px-6">Alasan</th>
                                            <th className="py-4 px-6 text-center">Status</th>
                                            <th className="py-4 px-6 text-center w-48">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {laporan.data.length > 0 ? laporan.data.map((item, index) => {
                                            const staffName = item.staff?.name || item.staff?.username || 'Staff';
                                            const divisi = (item.staff?.role || 'umum').toLowerCase();
                                            const rowNumber = (laporan.from || 1) + index;

                                            return (
                                                <tr key={item.id} className="hover:bg-[#FDF3E4]/50 transition-colors duration-150">
                                                    <td className="py-4 px-6 text-center text-gray-400 font-medium">{rowNumber}</td>
                                                    <td className="py-4 px-6 text-gray-800">
                                                        <div className="font-bold text-gray-800">{formatDate(item.created_at)}</div>
                                                        <div className="text-xs text-[#8B5E3C] font-semibold mt-0.5">
                                                            Oleh: {staffName} ({divisi})
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-gray-800 font-bold">{item.item?.nama}</td>
                                                    <td className="py-4 px-6 text-gray-600 font-medium">
                                                        {Number(item.kuantitas)} porsi
                                                    </td>
                                                    <td className="py-4 px-6 text-gray-600 font-medium">{item.alasan}</td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${getStatusStyle(item.status)}`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        {item.status === 'Menunggu Verifikasi' ? (
                                                            <div className="flex justify-center gap-2">
                                                                <button 
                                                                    onClick={() => openConfirmModal(item.id, 'approve', item.item?.nama)}
                                                                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button 
                                                                    onClick={() => openConfirmModal(item.id, 'reject', item.item?.nama)}
                                                                    className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs italic font-medium">Tervalidasi</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-gray-400 italic">Tidak ada laporan kerugian yang ditemukan.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Footer Pagination */}
                    {laporan.links && laporan.links.length > 3 && (
                        <div className="mt-auto flex justify-center pt-4 pb-2">
                            <div className="flex flex-wrap justify-center gap-1 bg-white p-1 rounded-full border border-gray-100 shadow-xs">
                                {laporan.links.map((link, i) => {
                                    let label = link.label;
                                    if (label.includes('&laquo;')) label = 'Prev';
                                    if (label.includes('&raquo;')) label = 'Next';

                                    return (
                                        <a
                                            key={i}
                                            href={link.url || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (link.url) {
                                                    router.get(link.url, {}, { preserveState: true, preserveScroll: true });
                                                }
                                            }}
                                            dangerouslySetInnerHTML={{ __html: label }}
                                            className={`px-3 sm:px-4 py-2 rounded-full text-xs font-bold transition-all ${
                                                link.active
                                                    ? "bg-[#D9A978] text-white shadow-xs"
                                                    : "text-gray-600 hover:bg-gray-50 hover:text-[#8B5E3C]"
                                            } ${!link.url ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Konfirmasi Card di Tengah */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 md:p-8 text-center border border-gray-100 animate-in fade-in zoom-in duration-200">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner ${confirmModal.action === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {confirmModal.action === 'approve' ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                        </div>
                        
                        <h3 className="text-lg font-extrabold text-gray-800 mb-1">
                            {confirmModal.action === 'approve' ? 'Setujui Laporan?' : 'Tolak Laporan?'}
                        </h3>
                        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                            Apakah Anda yakin ingin {confirmModal.action === 'approve' ? 'menyetujui' : 'menolak'} kerugian bahan <span className="font-bold text-gray-700">"{confirmModal.itemName}"</span>?
                        </p>

                        <div className="flex justify-between gap-3">
                            <button 
                                type="button" 
                                onClick={() => setConfirmModal({ isOpen: false, id: null, action: null, itemName: '' })} 
                                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-sm font-bold transition active:scale-95"
                            >
                                Batal 
                            </button>
                            <button 
                                type="button" 
                                onClick={handleExecuteAction} 
                                className={`flex-1 px-4 py-2.5 text-white rounded-2xl text-sm font-bold shadow-md transition active:scale-95 ${confirmModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                            >
                                Ya, {confirmModal.action === 'approve' ? 'Setujui' : 'Tolak'} 
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}