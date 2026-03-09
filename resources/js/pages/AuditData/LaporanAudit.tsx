import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from "@/layouts/app-layout";

// Mendefinisikan tipe data dari Controller
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

    // Fungsi untuk Export data ke CSV (Excel)
    // Fungsi untuk Export data ke CSV (Excel) versi Rapi
    // Fungsi untuk Export data ke Excel (.xls) dengan format Tabel Rapi
    const handleDownloadExcel = () => {
        // Kita suntikkan desain tabel dan lebar kolom langsung ke dalam file
        let tableHTML = `
            <html xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head>
                <meta charset="utf-8">
                <style>
                    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                    th { font-weight: bold; background-color: #f3f4f6; border: 1px solid #000000; padding: 8px; text-align: left; }
                    td { border: 1px solid #000000; padding: 8px; vertical-align: top; }
                    h2 { font-family: sans-serif; font-size: 16px; margin-bottom: 5px; color: #333; }
                </style>
            </head>
            <body>
        `;

        // 1. Tabel Item Duplikat
        tableHTML += `<h2> 1. ITEM DUPLIKAT </h2>`;
        tableHTML += `<table>
            <tr>
                <th style="width: 300px;">Nama Item</th>
                <th style="width: 150px;">Divisi</th>
                <th style="width: 150px;">Kategori</th>
                <th style="width: 150px;">Jumlah Terdaftar</th>
            </tr>`;
        item_duplikat.forEach(item => {
            tableHTML += `<tr><td>${item.nama}</td><td>${item.division}</td><td>${item.kategori}</td><td style="color: red; font-weight: bold;">${item.jumlah} Kali</td></tr>`;
        });
        tableHTML += `</table><br>`;

        // 2. Tabel Resep Kosong
        tableHTML += `<h2> 2. RESEP TANPA BAHAN MENTAH </h2>`;
        tableHTML += `<table>
            <tr>
                <th style="width: 300px;">Nama Menu</th>
                <th style="width: 150px;">Divisi</th>
            </tr>`;
        resep_tanpa_bahan.forEach(resep => {
            tableHTML += `<tr><td>${resep.name}</td><td>${resep.division}</td></tr>`;
        });
        tableHTML += `</table><br>`;

        // 3. Tabel Bahan Tidak Terhubung
        tableHTML += `<h2> 3. BAHAN MENTAH TIDAK TERHUBUNG </h2>`;
        tableHTML += `<table>
            <tr>
                <th style="width: 300px;">Nama Bahan</th>
                <th style="width: 150px;">Kategori</th>
                <th style="width: 150px;">Divisi</th>
            </tr>`;
        bahan_nganggur.forEach(bahan => {
            tableHTML += `<tr><td>${bahan.nama}</td><td>${bahan.kategori}</td><td>${bahan.division}</td></tr>`;
        });
        tableHTML += `</table></body></html>`;

        // Proses Download sebagai file .xls
        const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Laporan_Audit_Data_${new Date().toISOString().split('T')[0]}.xls`);

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <AppLayout>
            <div className="p-6 bg-gray-50 min-h-screen">
                <Head title="Audit Data Sistem" />

                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header & Tombol Download */}
                    <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                ⚠️ Ruang Kontrol: Audit Data Sistem
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Sistem mendeteksi adanya potensi <strong>human mistake</strong> (kesalahan input staf) pada Master Data.
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadExcel}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow transition"
                        >
                            📥 Download Laporan (Excel)
                        </button>
                    </div>

                    {/* TABEL 1: ITEM DUPLIKAT */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-red-50 px-6 py-4 border-b border-red-100">
                            <h2 className="text-lg font-bold text-red-800">1. Daftar Item Terduplikat</h2>
                            <p className="text-sm text-red-600">Item di bawah ini terdaftar lebih dari 1 kali. Harap hapus sisanya di menu Data Induk.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Item</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Divisi</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah Terdaftar</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {item_duplikat.length > 0 ? item_duplikat.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-red-50">
                                            <td className="px-6 py-4 font-semibold text-gray-800">{item.nama}</td>
                                            <td className="px-6 py-4 text-gray-600 uppercase">{item.division}</td>
                                            <td className="px-6 py-4 text-red-600 font-bold">{item.jumlah} Kali</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={3} className="px-6 py-4 text-center text-green-600 font-bold">✅ Bersih! Tidak ada data duplikat.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* TABEL 2: RESEP KOSONG */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                            <h2 className="text-lg font-bold text-orange-800">2. Daftar Menu Tanpa Resep</h2>
                            <p className="text-sm text-orange-600">Menu ini tidak memiliki komposisi bahan mentah. Stoknya akan terus nyangkut di angka 0.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Menu</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Divisi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {resep_tanpa_bahan.length > 0 ? resep_tanpa_bahan.map((resep, idx) => (
                                        <tr key={idx} className="hover:bg-orange-50">
                                            <td className="px-6 py-4 font-semibold text-gray-800">{resep.name}</td>
                                            <td className="px-6 py-4 text-gray-600 uppercase">{resep.division}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={2} className="px-6 py-4 text-center text-green-600 font-bold">✅ Bersih! Semua menu punya resep.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* TABEL 3: BAHAN NGANGGUR */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-100">
                            <h2 className="text-lg font-bold text-yellow-800">3. Bahan Mentah "Daftar Bahan Mentah Tidak Terhubung"</h2>
                            <p className="text-sm text-yellow-600">Bahan mentah ini terdaftar di Data Induk, tapi tidak pernah dipakai di dalam resep mana pun.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Bahan Mentah</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Divisi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {bahan_nganggur.length > 0 ? bahan_nganggur.map((bahan, idx) => (
                                        <tr key={idx} className="hover:bg-yellow-50">
                                            <td className="px-6 py-4 font-semibold text-gray-800">{bahan.nama}</td>
                                            <td className="px-6 py-4 text-gray-600 uppercase">{bahan.division}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={2} className="px-6 py-4 text-center text-green-600 font-bold">✅ Bersih! Semua bahan mentah terpakai.</td></tr>
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
