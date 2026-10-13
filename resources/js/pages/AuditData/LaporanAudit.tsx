import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from "@/layouts/app-layout";
import { Download, AlertTriangle, CheckCircle2, FileSearch } from 'lucide-react';

interface ItemDuplikat {
    nama: string;
    division: string;
    kategori: string;
    jumlah: number;
}

interface ResepKosong {
    id: number;
    name: string;
    division: string;
}

interface BahanNganggur {
    id: number;
    nama: string;
    kategori: string;
    division: string;
}

interface Props {
    item_duplikat: ItemDuplikat[];
    resep_tanpa_bahan: ResepKosong[];
    bahan_nganggur: BahanNganggur[];
}

export default function AuditDataIndex({ item_duplikat, resep_tanpa_bahan, bahan_nganggur }: Props) {

    const handleDownloadExcel = () => {
        // Ambil waktu saat ini untuk Kop Laporan
        const today = new Date();
        const dateStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = today.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        let tableHTML = `
            <html xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Calibri', sans-serif; }
                    .header-title { font-size: 20px; font-weight: bold; color: #1f2937; text-align: center; }
                    .header-subtitle { font-size: 14px; color: #4b5563; text-align: center; margin-bottom: 20px; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 30px; font-size: 14px; }
                    th { font-weight: bold; background-color: #f3f4f6; border: 1px solid #d1d5db; padding: 10px; text-align: center; text-transform: uppercase; }
                    td { border: 1px solid #d1d5db; padding: 8px 10px; text-transform: capitalize; }
                    h2 { font-size: 16px; margin-bottom: 8px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
                    .text-center { text-align: center; }
                    .text-danger { color: #dc2626; font-weight: bold; }
                    .empty-row { font-style: italic; color: #16a34a; font-weight: bold; text-align: center; background-color: #f0fdf4; }
                </style>
            </head>
            <body>
                <div class="header-title">LAPORAN AUDIT & VALIDASI DATA</div>
                <div class="header-subtitle">WARUNG CANGKRUK</div>
                <div class="header-subtitle">Tanggal Tarik: ${dateStr} ${timeStr} WIB</div>
                <br>
        `;

        // 1. Tabel Item Duplikat
        tableHTML += `<h2> 1. DATA ITEM GANDA / TERDUPLIKAT </h2>`;
        tableHTML += `<table>
            <tr>
                <th style="width: 40px;">No</th>
                <th style="width: 250px;">Nama Item</th>
                <th style="width: 150px;">Divisi</th>
                <th style="width: 150px;">Kategori</th>
                <th style="width: 150px;">Status</th>
            </tr>`;
        if (item_duplikat.length > 0) {
            item_duplikat.forEach((item, index) => {
                tableHTML += `<tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${item.nama}</td>
                    <td class="text-center">${item.division}</td>
                    <td class="text-center">${item.kategori}</td>
                    <td class="text-center text-danger">${item.jumlah} Kali Input</td>
                </tr>`;
            });
        } else {
            tableHTML += `<tr><td colspan="5" class="empty-row">Aman! Tidak ada item ganda yang ditemukan.</td></tr>`;
        }
        tableHTML += `</table>`;

        // 2. Tabel Resep Kosong
        tableHTML += `<h2> 2. MENU TANPA PENGATURAN RESEP </h2>`;
        tableHTML += `<table>
            <tr>
                <th style="width: 40px;">No</th>
                <th style="width: 300px;">Nama Menu</th>
                <th style="width: 150px;">Divisi</th>
            </tr>`;
        if (resep_tanpa_bahan.length > 0) {
            resep_tanpa_bahan.forEach((resep, index) => {
                tableHTML += `<tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${resep.name}</td>
                    <td class="text-center">${resep.division}</td>
                </tr>`;
            });
        } else {
             tableHTML += `<tr><td colspan="3" class="empty-row">Aman! Semua menu sudah memiliki resep bahan.</td></tr>`;
        }
        tableHTML += `</table>`;

        // 3. Tabel Bahan Tidak Terhubung
        tableHTML += `<h2> 3. BAHAN MENTAH BELUM MASUK RESEP </h2>`;
        tableHTML += `<table>
            <tr>
                <th style="width: 40px;">No</th>
                <th style="width: 300px;">Nama Bahan Mentah</th>
                <th style="width: 150px;">Kategori</th>
                <th style="width: 150px;">Divisi</th>
            </tr>`;
        if (bahan_nganggur.length > 0) {
            bahan_nganggur.forEach((bahan, index) => {
                tableHTML += `<tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${bahan.nama}</td>
                    <td class="text-center">${bahan.kategori}</td>
                    <td class="text-center">${bahan.division}</td>
                </tr>`;
            });
        } else {
             tableHTML += `<tr><td colspan="4" class="empty-row">Aman! Seluruh bahan mentah sudah terpakai di resep.</td></tr>`;
        }
        tableHTML += `</table></body></html>`;

        // Proses Download
        const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Audit_Data_Warung_${new Date().toISOString().split('T')[0]}.xls`);

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <AppLayout header="Pusat Kontrol Data">
            <Head title="Pusat Kontrol Data" />
            
            {/* 🔥 STRUKTUR CONTAINER DISEJAJARKAN DENGAN STANDAR ENTERPRISE 🔥 */}
            <div className="space-y-6 py-6">
                <div className="rounded-3xl bg-[#F2ECE4] dark:bg-[#2A221C] p-4 md:p-8 shadow-sm border border-amber-200/60 dark:border-[#45372C]">
                    <div className="rounded-3xl bg-white dark:bg-[#231C17] p-4 md:p-6 shadow-xs border border-gray-100 dark:border-[#3D3127] min-h-[600px] flex flex-col">

                        {/* --- HEADER CONTROL & TOOLBAR --- */}
                        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-[#3D3127] pb-5">
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-[#D9A978]/15 dark:bg-amber-400/10 text-[#8B5E3C] dark:text-amber-400 items-center justify-center shadow-inner flex-shrink-0">
                                    <FileSearch className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800 dark:text-[#FAF5ED]">
                                        Pusat Kontrol & Validasi Data
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-[#A89B8C] mt-0.5">
                                        Periksa potensi kesalahan input atau data yang belum lengkap sebelum laporan.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleDownloadExcel}
                                className="flex items-center justify-center gap-2 rounded-full bg-[#8B5E3C] hover:bg-[#6F4E37] px-5 py-2.5 sm:py-2 text-sm font-bold text-white shadow-md transition active:scale-95 w-full sm:w-auto"
                            >
                                <Download className="h-4 w-4" />
                                Export Excel
                            </button>
                        </div>

                        {/* --- KONTEN TABEL AUDIT --- */}
                        <div className="space-y-10 flex-1">

                            {/* TABEL 1: ITEM DUPLIKAT */}
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-bold text-gray-800 dark:text-[#FAF5ED] flex items-center gap-2">
                                            1. Data Item Ganda / Terduplikat
                                            {item_duplikat.length > 0 && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-[#A89B8C] mt-1">
                                            Item berikut tercatat lebih dari sekali di sistem. Silakan hapus data yang berlebih.
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full rounded-2xl border border-gray-100 dark:border-[#3D3127] overflow-hidden">
                                    <div className="w-full overflow-x-auto">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-[#FAF7F2]/80 dark:bg-[#1E1915] text-gray-500 dark:text-[#A89B8C] font-bold uppercase text-[11px] tracking-wider border-b border-gray-100 dark:border-[#3D3127]">
                                                <tr>
                                                    <th className="px-6 py-4">Nama Item</th>
                                                    <th className="px-6 py-4 text-center">Divisi</th>
                                                    <th className="px-6 py-4 text-center">Jumlah Terdaftar</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-[#3D3127]">
                                                {item_duplikat.length > 0 ? (
                                                    item_duplikat.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors">
                                                            <td className="px-6 py-4 font-bold text-gray-800 dark:text-[#FAF5ED]">{item.nama}</td>
                                                            <td className="px-6 py-4 text-center text-gray-600 dark:text-[#C8BCAE] uppercase font-medium">{item.division}</td>
                                                            <td className="px-6 py-4 text-center font-bold text-rose-600 dark:text-rose-400">
                                                                <span className="bg-rose-100 dark:bg-rose-900/40 px-3 py-1 rounded-full text-xs">{item.jumlah} Kali Input</span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={3} className="px-6 py-8 text-center text-emerald-600 dark:text-emerald-400 font-bold text-sm bg-emerald-50/30 dark:bg-emerald-900/10">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Aman! Tidak ada item ganda yang ditemukan.
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* TABEL 2: RESEP KOSONG */}
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-bold text-gray-800 dark:text-[#FAF5ED] flex items-center gap-2">
                                            2. Menu Tanpa Pengaturan Resep
                                            {resep_tanpa_bahan.length > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-[#A89B8C] mt-1">
                                            Menu ini belum diatur komposisi bahannya. Stok tidak akan berkurang saat terjual.
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full rounded-2xl border border-gray-100 dark:border-[#3D3127] overflow-hidden">
                                    <div className="w-full overflow-x-auto">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-[#FAF7F2]/80 dark:bg-[#1E1915] text-gray-500 dark:text-[#A89B8C] font-bold uppercase text-[11px] tracking-wider border-b border-gray-100 dark:border-[#3D3127]">
                                                <tr>
                                                    <th className="px-6 py-4">Nama Menu</th>
                                                    <th className="px-6 py-4 text-center w-48">Divisi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-[#3D3127]">
                                                {resep_tanpa_bahan.length > 0 ? (
                                                    resep_tanpa_bahan.map((resep, idx) => (
                                                        <tr key={idx} className="hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-colors">
                                                            <td className="px-6 py-4 font-bold text-gray-800 dark:text-[#FAF5ED]">{resep.name}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="bg-gray-100 dark:bg-[#2A221C] text-gray-600 dark:text-[#C8BCAE] uppercase font-medium px-3 py-1 rounded-full text-xs border border-gray-200 dark:border-[#45372C]">{resep.division}</span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={2} className="px-6 py-8 text-center text-emerald-600 dark:text-emerald-400 font-bold text-sm bg-emerald-50/30 dark:bg-emerald-900/10">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Aman! Semua menu sudah memiliki resep bahan.
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* TABEL 3: BAHAN NGANGGUR */}
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-bold text-gray-800 dark:text-[#FAF5ED] flex items-center gap-2">
                                            3. Bahan Mentah Belum Masuk Resep
                                            {bahan_nganggur.length > 0 && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-[#A89B8C] mt-1">
                                            Bahan terdaftar di sistem, tapi belum pernah dimasukkan ke dalam racikan menu manapun.
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full rounded-2xl border border-gray-100 dark:border-[#3D3127] overflow-hidden">
                                    <div className="w-full overflow-x-auto">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-[#FAF7F2]/80 dark:bg-[#1E1915] text-gray-500 dark:text-[#A89B8C] font-bold uppercase text-[11px] tracking-wider border-b border-gray-100 dark:border-[#3D3127]">
                                                <tr>
                                                    <th className="px-6 py-4">Nama Bahan Mentah</th>
                                                    <th className="px-6 py-4 text-center">Kategori</th>
                                                    <th className="px-6 py-4 text-center">Divisi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-[#3D3127]">
                                                {bahan_nganggur.length > 0 ? (
                                                    bahan_nganggur.map((bahan, idx) => (
                                                        <tr key={idx} className="hover:bg-yellow-50/50 dark:hover:bg-yellow-900/20 transition-colors">
                                                            <td className="px-6 py-4 font-bold text-gray-800 dark:text-[#FAF5ED]">{bahan.nama}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="bg-[#FDF3E4] dark:bg-[#3E3024] text-[#8B5E3C] dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-100 dark:border-amber-800/40 shadow-xs">{bahan.kategori}</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center text-gray-600 dark:text-[#C8BCAE] uppercase font-medium">{bahan.division}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={3} className="px-6 py-8 text-center text-emerald-600 dark:text-emerald-400 font-bold text-sm bg-emerald-50/30 dark:bg-emerald-900/10">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Aman! Seluruh bahan mentah sudah terpakai di resep.
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}