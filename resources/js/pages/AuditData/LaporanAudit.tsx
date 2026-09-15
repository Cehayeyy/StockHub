import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from "@/layouts/app-layout";

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
                <div class="header-subtitle">Tanggal Tarik: ${dateStr} - ${timeStr} WIB</div>
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
            <div className="py-6">
                <div className="bg-[#F2ECE4] p-4 md:p-8 rounded-3xl shadow-sm border border-amber-200/60 min-h-[600px] flex flex-col space-y-6">

                    {/* Header & Tombol Download */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl shadow-xs border border-gray-100 border-l-4 border-amber-500 gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                                🔍 Pusat Kontrol & Validasi Data
                            </h1>
                            <p className="text-gray-500 text-xs sm:text-sm mt-1">
                                Periksa potensi kesalahan input atau data yang belum lengkap sebelum masuk ke laporan harian.
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadExcel}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-sm transition flex items-center gap-2 text-xs sm:text-sm flex-shrink-0 active:scale-95"
                        >
                            📥 Download Laporan (.xls)
                        </button>
                    </div>

                    {/* TABEL 1: ITEM DUPLIKAT */}
                    <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
                        <div className="bg-rose-50/70 px-6 py-4 border-b border-rose-100">
                            <h2 className="text-base font-bold text-rose-800">1. Data Item Ganda / Terduplikat</h2>
                            <p className="text-xs text-rose-600 mt-0.5">Item berikut tercatat lebih dari sekali di sistem. Silakan hapus data yang tidak perlu lewat menu Data Induk.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-[#FAF7F2]/80 text-gray-500 font-bold uppercase text-[11px] tracking-wider border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Nama Item</th>
                                        <th className="px-6 py-4">Divisi</th>
                                        <th className="px-6 py-4">Jumlah Terdaftar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {item_duplikat.length > 0 ? item_duplikat.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-800">{item.nama}</td>
                                            <td className="px-6 py-4 text-gray-600 uppercase font-medium">{item.division}</td>
                                            <td className="px-6 py-4 text-rose-600 font-bold">{item.jumlah} Kali</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={3} className="px-6 py-10 text-center text-emerald-600 font-bold text-sm bg-emerald-50/20">✨ Aman! Tidak ada item ganda yang ditemukan.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* TABEL 2: RESEP KOSONG */}
                    <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
                        <div className="bg-amber-50/70 px-6 py-4 border-b border-amber-100">
                            <h2 className="text-base font-bold text-amber-900">2. Menu Tanpa Pengaturan Resep</h2>
                            <p className="text-xs text-amber-700 mt-0.5">Menu ini belum diatur komposisi bahan mentahnya. Jika dibiarkan, stok kasir tidak akan berkurang saat terjual.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-[#FAF7F2]/80 text-gray-500 font-bold uppercase text-[11px] tracking-wider border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Nama Menu</th>
                                        <th className="px-6 py-4">Divisi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {resep_tanpa_bahan.length > 0 ? resep_tanpa_bahan.map((resep, idx) => (
                                        <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-800">{resep.name}</td>
                                            <td className="px-6 py-4 text-gray-600 uppercase font-medium">{resep.division}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={2} className="px-6 py-10 text-center text-emerald-600 font-bold text-sm bg-emerald-50/20">✨ Aman! Semua menu sudah memiliki resep bahan.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* TABEL 3: BAHAN NGANGGUR */}
                    <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
                        <div className="bg-yellow-50/70 px-6 py-4 border-b border-yellow-100">
                            <h2 className="text-base font-bold text-yellow-900">3. Bahan Mentah Belum Masuk Resep</h2>
                            <p className="text-xs text-yellow-700 mt-0.5">Bahan ini sudah terdaftar di sistem, tapi belum pernah dimasukkan ke dalam racikan resep menu manapun.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-[#FAF7F2]/80 text-gray-500 font-bold uppercase text-[11px] tracking-wider border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Nama Bahan Mentah</th>
                                        <th className="px-6 py-4">Divisi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {bahan_nganggur.length > 0 ? bahan_nganggur.map((bahan, idx) => (
                                        <tr key={idx} className="hover:bg-yellow-50/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-800">{bahan.nama}</td>
                                            <td className="px-6 py-4 text-gray-600 uppercase font-medium">{bahan.division}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={2} className="px-6 py-10 text-center text-emerald-600 font-bold text-sm bg-emerald-50/20">✨ Aman! Seluruh bahan mentah sudah terpakai di resep.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </AppLayout>
    );
}