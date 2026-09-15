import React, { useState, useEffect } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from "@/layouts/app-layout";
import { Plus, X, Search, Calendar, Trash2 } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";

interface Item {
    id: number;
    nama: string;
    satuan: string;
}

interface Laporan {
    id: number;
    created_at: string;
    item: { nama: string; satuan: string };
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
    bahanMentah: Item[];
    division: string;
    filters?: {
        search?: string;
        tanggal?: string;
    };
}

export default function LaporanKerugian({ laporan, bahanMentah, division, filters }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState(filters?.search || '');
    const [tanggal, setTanggal] = useState(filters?.tanggal || '');
    const [showCalendar, setShowCalendar] = useState(false);

    const { data, setData, post, processing, reset, errors } = useForm({
        items: [
            { item_id: '', kuantitas: '1', alasan: '', catatan: '' }
        ]
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            router.get(
                route('laporan-kerugian.index'),
                { search, tanggal },
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [search, tanggal]);

    const addItemRow = () => {
        setData('items', [...data.items, { item_id: '', kuantitas: '1', alasan: '', catatan: '' }]);
    };

    const removeItemRow = (index: number) => {
        if (data.items.length === 1) return;
        const updated = data.items.filter((_, i) => i !== index);
        setData('items', updated);
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const updated = [...data.items];
        updated[index] = { ...updated[index], [field]: value };
        setData('items', updated);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('laporan-kerugian.store'), {
            onSuccess: () => {
                setIsModalOpen(false);
                reset();
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
            case 'Disetujui': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Ditolak': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200';
        }
    };

    return (
        <AppLayout header="Laporan Kerugian">
            <Head title="Laporan Kerugian" />

            <div className="py-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm min-h-[600px] border border-gray-100 flex flex-col justify-between">
                    
                    <div>
                        {/* Header & Filter Bar */}
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 pb-4 border-b border-gray-100 gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Pencatatan Kerugian</h2>
                                <p className="text-sm text-gray-500 mt-1">Kelola dan catat daftar barang rusak atau hilang.</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                {/* Tombol Catat Kerugian Baru */}
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex justify-center items-center gap-2 rounded-full bg-[#F3CFA2] px-5 py-2 text-sm font-medium text-[#7A4A2B] shadow-sm hover:bg-[#e8c393] transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Catat Kerugian Baru</span>
                                </button>

                                {/* Date Picker */}
                                <div className="relative w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setShowCalendar((v) => !v)}
                                        className="inline-flex justify-between sm:justify-center items-center gap-2 rounded-full bg-[#F3CFA2] px-5 py-2 text-sm font-medium text-[#7A4A2B] shadow-sm hover:bg-[#e8c393] transition-colors w-full sm:w-auto"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>{displayFilterDate}</span>
                                        </div>
                                    </button>

                                    {showCalendar && (
                                        <div className="absolute right-0 mt-2 rounded-2xl bg-[#E7BE8B] p-3 shadow-lg z-20 w-full sm:w-auto animate-in fade-in zoom-in-95">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-[#7A4A2B]">Filter Tanggal</span>
                                                {tanggal && (
                                                    <button 
                                                        onClick={() => { setTanggal(''); setShowCalendar(false); }}
                                                        className="text-xs text-[#7A4A2B] hover:text-black font-bold underline"
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
                                                className="w-full rounded-md border border-[#D4A574] px-2 py-1 text-sm bg-white focus:ring-[#8B5E3C] focus:border-[#8B5E3C]"
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
                                        placeholder="Cari bahan/alasan..."
                                        className="w-full sm:w-64 rounded-full border border-[#E5C39C] bg-[#FDF3E4] pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E5C39C]"
                                    />
                                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="py-4 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">No</th>
                                        <th className="py-4 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Tanggal</th>
                                        <th className="py-4 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Nama Bahan Baku</th>
                                        <th className="py-4 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Kuantitas</th>
                                        <th className="py-4 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Alasan</th>
                                        <th className="py-4 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {laporan.data.length > 0 ? laporan.data.map((item, index) => {
                                        const rowNumber = (laporan.from || 1) + index;
                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50/50 transition">
                                                <td className="py-4 px-4 text-gray-500 text-sm font-medium">{rowNumber}</td>
                                                <td className="py-4 px-4 text-gray-800 text-sm">{formatDate(item.created_at)}</td>
                                                <td className="py-4 px-4 text-gray-800 font-medium text-sm">{item.item?.nama}</td>
                                                <td className="py-4 px-4 text-gray-800 text-sm">
                                                    {Number(item.kuantitas)} porsi
                                                </td>
                                                <td className="py-4 px-4 text-gray-800 text-sm">{item.alasan}</td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(item.status)}`}>
                                                        {item.status === 'Disetujui' ? 'Selesai' : item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">Belum ada catatan kerugian.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer Pagination */}
                    {laporan.links && laporan.links.length > 3 && (
                        <div className="mt-auto flex justify-center pt-6 pb-2 border-t border-gray-100">
                            <div className="flex flex-wrap justify-center gap-1 bg-gray-50 p-1 rounded-full border border-gray-200">
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
                                            className={`px-3 sm:px-4 py-2 rounded-full text-xs font-medium transition-all ${
                                                link.active
                                                    ? "bg-[#D9A978] text-white shadow-md"
                                                    : "text-gray-600 hover:bg-white hover:text-[#D9A978]"
                                            } ${!link.url ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Form Borongan (Multi-Item) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-lg md:max-w-3xl rounded-3xl shadow-xl p-6 md:p-8 transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold text-gray-800">Form Pencatatan Kerugian Borongan</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Divisi: <span className="font-semibold uppercase text-amber-700">{division}</span></p>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); reset(); }} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {data.items.map((row, index) => (
                                <div key={index} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-4 relative">
                                    {data.items.length > 1 && (
                                        <button 
                                            type="button" 
                                            onClick={() => removeItemRow(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition"
                                            title="Hapus Baris"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}

                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm font-bold text-gray-700">Item #{index + 1}</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block mb-1 text-xs font-bold text-gray-700 ml-1">Bahan Baku</label>
                                            <CustomSelect 
                                                value={row.item_id}
                                                onChange={(val) => handleItemChange(index, 'item_id', val)}
                                                options={bahanMentah.map(b => ({
                                                    value: b.id,
                                                    label: b.nama
                                                }))}
                                                placeholder="Pilih Bahan Baku..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block mb-1 text-xs font-bold text-gray-700 ml-1">Jumlah Kuantitas</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    value="1"
                                                    readOnly
                                                    disabled
                                                    className="w-full bg-gray-100 rounded-xl px-4 py-3 border border-gray-200 text-gray-500 cursor-not-allowed text-sm"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold select-none pointer-events-none">
                                                    porsi
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block mb-1 text-xs font-bold text-gray-700 ml-1">Alasan Kerugian</label>
                                        <input 
                                            type="text"
                                            value={row.alasan}
                                            onChange={e => handleItemChange(index, 'alasan', e.target.value)}
                                            className="w-full bg-white rounded-xl px-4 py-3 border border-gray-200 focus:ring-2 focus:ring-[#D9A978] outline-none text-sm"
                                            placeholder="Contoh: Tumpah saat disajikan, kemasan rusak..."
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block mb-1 text-xs font-bold text-gray-700 ml-1">Catatan Tambahan (Opsional)</label>
                                        <input 
                                            type="text"
                                            value={row.catatan}
                                            onChange={e => handleItemChange(index, 'catatan', e.target.value)}
                                            className="w-full bg-white rounded-xl px-4 py-3 border border-gray-200 focus:ring-2 focus:ring-[#D9A978] outline-none text-sm"
                                            placeholder="Keterangan tambahan jika ada..."
                                        />
                                    </div>
                                </div>
                            ))}

                            {/* Tombol Tambah Item Lainnya */}
                            <button
                                type="button"
                                onClick={addItemRow}
                                className="w-full py-3 border-2 border-dashed border-[#D9A978] rounded-xl text-[#D9A978] font-bold text-sm hover:bg-[#D9A978]/5 transition flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Tambah Item Lainnya
                            </button>

                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => { setIsModalOpen(false); reset(); }} className="px-6 py-2.5 bg-gray-200 rounded-full text-gray-700 font-semibold hover:bg-gray-300 transition text-sm">
                                    Batal
                                </button>
                                <button type="submit" disabled={processing} className="px-6 py-2.5 rounded-full font-bold text-white shadow-md text-sm transition bg-[#D9A978] hover:bg-[#c4925e] disabled:opacity-50">
                                    {processing ? 'Menyimpan Semua...' : 'Simpan Semua'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}