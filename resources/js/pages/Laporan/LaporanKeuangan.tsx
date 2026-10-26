import React, { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, router } from "@inertiajs/react";
import {
  Download,
  Plus,
  X,
  Save,
  Calendar,
  FileText,
  TrendingUp,
  CreditCard,
  DollarSign
} from "lucide-react";

// 🔥 INTERFACE DISESUAIKAN TOTAL DENGAN FORMAT DOCX KLIEN 🔥
interface Props {
  data: {
    periode: string;
    // 1. PENJUALAN
    pendapatanBar: number;
    pendapatanDapur: number;
    pendapatanTrekking: number;
    
    // 2. HPP
    hppDapur: number;
    hppBar: number;
    hppTrekking: number;
    
    // 3. BEBAN OPERASIONAL
    biayaGaji: number;
    perlengkapanWarung: number;
    kerugianBahanBaku: number;
    adminBank: number;
    operasionalWarung: number;
    biayaSewa: number;
    perbaikanInventaris: number;
    pemeliharaanWarung: number;
    biayaMarketing: number;
    biayaLainLain: number;
    biayaPajak: number;
    utilitas: number;
    
    // 4. BEBAN LAIN & PAJAK
    bebanLainLain: number;
    pajakPenghasilan: number;
  };
  selectedDate?: string; // 🔥 UBAH 1: Dari selectedMonth menjadi selectedDate
}

export default function LaporanKeuangan({ data, selectedDate: initialDate }: Props) {
  // 🔥 UBAH 2: State default menjadi Y-m-d (Harian)
  const [selectedDate, setSelectedDate] = useState(
    initialDate || new Date().toISOString().slice(0, 10)
  );
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Fungsi Format Angka
  const formatNumberWithDots = (val: string | number) => {
    if (val === "" || val === null || val === undefined) return "0";
    const cleanNum = String(val).replace(/\D/g, "");
    if (!cleanNum) return "0";
    return new Intl.NumberFormat("id-ID").format(Number(cleanNum));
  };

  const parseFormattedNumber = (val: string): number => {
    const cleanNum = val.replace(/\D/g, "");
    return cleanNum ? Number(cleanNum) : 0;
  };

  const formatIDR = (val: number) => {
    const isNegative = val < 0;
    const absoluteVal = Math.abs(val);
    const formatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(absoluteVal);
    
    return isNegative ? `(${formatted})` : formatted;
  };

  const calculatePercentage = (val: number, total: number) => {
    if (!total || total === 0) return "0%";
    const percentage = (val / total) * 100;
    return `${percentage.toFixed(1)}%`;
  };

  // State untuk Modal Input OPEX
  const [opexInputs, setOpexInputs] = useState({
    biayaGaji: "0",
    perlengkapanWarung: "0",
    adminBank: "0",
    operasionalWarung: "0",
    biayaSewa: "0",
    perbaikanInventaris: "0",
    pemeliharaanWarung: "0",
    biayaMarketing: "0",
    biayaLainLain: "0",
    biayaPajak: "0",
    utilitas: "0",
    bebanLainLain: "0",
    pajakPenghasilan: "0",
  });

  useEffect(() => {
    setOpexInputs({
      biayaGaji: formatNumberWithDots(data.biayaGaji),
      perlengkapanWarung: formatNumberWithDots(data.perlengkapanWarung),
      adminBank: formatNumberWithDots(data.adminBank),
      operasionalWarung: formatNumberWithDots(data.operasionalWarung),
      biayaSewa: formatNumberWithDots(data.biayaSewa),
      perbaikanInventaris: formatNumberWithDots(data.perbaikanInventaris),
      pemeliharaanWarung: formatNumberWithDots(data.pemeliharaanWarung),
      biayaMarketing: formatNumberWithDots(data.biayaMarketing),
      biayaLainLain: formatNumberWithDots(data.biayaLainLain),
      biayaPajak: formatNumberWithDots(data.biayaPajak),
      utilitas: formatNumberWithDots(data.utilitas),
      bebanLainLain: formatNumberWithDots(data.bebanLainLain),
      pajakPenghasilan: formatNumberWithDots(data.pajakPenghasilan),
    });
  }, [data]);

  const handleInputChange = (field: string, val: string) => {
    setOpexInputs((prev) => ({
      ...prev,
      [field]: formatNumberWithDots(val),
    }));
  };

  // 🔥 KALKULASI LAPORAN LABA RUGI 🔥
  const totalPenjualan = data.pendapatanBar + data.pendapatanDapur + data.pendapatanTrekking;
  const jumlahHpp = data.hppDapur + data.hppBar + data.hppTrekking;
  const labaKotor = totalPenjualan - jumlahHpp;

  const totalBebanOperasional = 
    data.biayaGaji + 
    data.perlengkapanWarung + 
    data.kerugianBahanBaku + 
    data.adminBank + 
    data.operasionalWarung + 
    data.biayaSewa + 
    data.perbaikanInventaris + 
    data.pemeliharaanWarung + 
    data.biayaMarketing + 
    data.biayaLainLain + 
    data.biayaPajak + 
    data.utilitas;

  const labaUsahaSetelahBeban = labaKotor - totalBebanOperasional;
  const jumlahBebanLain = data.bebanLainLain;
  const labaSebelumPajak = labaUsahaSetelahBeban - jumlahBebanLain;
  const labaSetelahPajak = labaSebelumPajak - data.pajakPenghasilan;
  const totalPengeluaran = jumlahHpp + totalBebanOperasional + jumlahBebanLain + data.pajakPenghasilan;

  // 🔥 UBAH 3: Fungsi handle pencarian ke parameter "tanggal"
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedDate(val);
    router.get(
      "/laporan/keuangan",
      { tanggal: val },
      { preserveState: true, preserveScroll: true }
    );
    setShowCalendar(false);
  };

  const handleSaveOpex = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🔥 UBAH 4: Konversi format tanggal Y-m-d ke format Y-m (Bulan) untuk Simpan Opex
    const periodeBulan = selectedDate.substring(0, 7); 
    
    const payload = {
      periode: periodeBulan,
      biaya_gaji: parseFormattedNumber(opexInputs.biayaGaji),
      perlengkapan_warung: parseFormattedNumber(opexInputs.perlengkapanWarung),
      admin_bank: parseFormattedNumber(opexInputs.adminBank),
      operasional_warung: parseFormattedNumber(opexInputs.operasionalWarung),
      biaya_sewa: parseFormattedNumber(opexInputs.biayaSewa),
      perbaikan_inventaris: parseFormattedNumber(opexInputs.perbaikanInventaris),
      pemeliharaan_warung: parseFormattedNumber(opexInputs.pemeliharaanWarung),
      biaya_marketing: parseFormattedNumber(opexInputs.biayaMarketing),
      biaya_lain_lain: parseFormattedNumber(opexInputs.biayaLainLain),
      biaya_pajak: parseFormattedNumber(opexInputs.biayaPajak),
      utilitas: parseFormattedNumber(opexInputs.utilitas),
      beban_lain_lain: parseFormattedNumber(opexInputs.bebanLainLain),
      pajak_penghasilan: parseFormattedNumber(opexInputs.pajakPenghasilan),
    };

    router.post("/laporan/keuangan/opex", payload, {
      preserveScroll: true,
      onSuccess: () => {
        setIsModalOpen(false);
      },
    });
  };

  // 🔥 UBAH 5: Download Excel menggunakan parameter tanggal
  const handleExportExcel = () => {
    window.location.href = route('laporan.keuangan.export', { tanggal: selectedDate });
  };

  const TableRow = ({ label, value, isBold = false, isHeader = false, isIndent = false, isEmpty = false }: any) => (
    <tr className={`${isHeader ? 'bg-[#FAF7F2] dark:bg-[#1E1915]' : 'bg-white dark:bg-[#231C17]'} ${isBold ? 'font-bold text-gray-800 dark:text-[#FAF5ED]' : 'text-gray-600 dark:text-[#C8BCAE]'} border-b border-[#F2ECE4] dark:border-[#3D3127]`}>
      <td className={`py-3 px-6 ${isIndent ? 'pl-10' : ''} ${isHeader ? 'uppercase tracking-wider text-xs' : 'text-sm'}`}>
        {label}
      </td>
      <td className="py-3 px-6 text-right font-medium text-sm w-48 border-l border-[#F2ECE4] dark:border-[#3D3127]">
        {!isEmpty && formatIDR(value)}
      </td>
      <td className="py-3 px-6 text-center text-sm w-24 border-l border-[#F2ECE4] dark:border-[#3D3127]">
        {!isEmpty && calculatePercentage(value, totalPenjualan)}
      </td>
    </tr>
  );

  return (
    <AppLayout header="Laporan Keuangan Bulanan">
      <Head title={`Laporan Keuangan ${data.periode}`} />

      <style>{`
        @media print {
          header, aside, button, input, .no-print, .modal-backdrop {
            display: none !important;
          }
          @page { size: A4 portrait; margin: 15mm; }
          body {
            background-color: white !important;
            color: black !important;
            font-size: 10pt;
          }
          .print-container { padding: 0 !important; margin: 0 !important; }
          .print-no-wrapper {
            background: none !important; border: none !important;
            box-shadow: none !important; padding: 0 !important; border-radius: 0 !important;
          }
          .print-table th { background-color: #3B82F6 !important; color: white !important; -webkit-print-color-adjust: exact; }
          .print-table td { border-color: #E5E7EB !important; }
        }
      `}</style>

      <div className="py-6 space-y-6 print-container">
        
        <div className="rounded-3xl bg-[#F2ECE4] dark:bg-[#2A221C] p-4 md:p-8 shadow-sm border border-amber-200/60 dark:border-[#45372C] print-no-wrapper">
          <div className="rounded-3xl bg-white dark:bg-[#231C17] p-4 md:p-6 shadow-xs border border-amber-100 dark:border-[#3D3127] min-h-[600px] flex flex-col print-no-wrapper">
            
            {/* HEADER & ACTION BAR */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-[#F2ECE4] dark:border-[#3D3127] pb-5 xl:border-b-0 xl:pb-0 mb-6 no-print">
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-[#FAF5ED]">Laporan Keuangan Bulanan (Laba Rugi)</h1>
                <p className="text-xs text-gray-500 dark:text-[#A89B8C] mt-1">
                  Format standar akuntansi berdasarkan pendapatan dan beban operasional warung.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-full bg-white dark:bg-[#231C17] border border-amber-200/60 dark:border-[#45372C] px-5 py-2 text-sm font-bold text-[#8B5E3C] dark:text-amber-400 shadow-sm hover:bg-[#FDF3E4]/50 transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" /> Input Data Beban
                </button>

                <div className="relative w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowCalendar((v) => !v)}
                    className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-center gap-2 rounded-full bg-white dark:bg-[#231C17] border border-amber-200/60 dark:border-[#45372C] px-5 py-2.5 sm:py-2 text-sm font-bold text-[#8B5E3C] dark:text-amber-400 shadow-sm hover:bg-[#FDF3E4]/50 transition-all outline-none focus:ring-2 focus:ring-[#D9A978]"
                  >
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>{data.periode}</span></div>
                  </button>
                  {showCalendar && (
                    <div className="absolute right-0 z-20 mt-2 w-64 rounded-3xl border border-amber-200/60 bg-white p-4 shadow-xl dark:border-[#45372E] dark:bg-[#2C231D] animate-in fade-in zoom-in-95">
                      <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#E5D8C9]">Pilih Tanggal</label>
                      {/* 🔥 UBAH 6: Kalender menjadi type "date" untuk pilih harian */}
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className="w-full cursor-pointer rounded-2xl border border-amber-200/60 bg-white px-3.5 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[#8B5E3C] dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center justify-center gap-2 rounded-full bg-[#8B5E3C] hover:bg-[#6F4E37] px-5 py-2.5 sm:py-2 text-sm font-bold text-white shadow-md transition w-full sm:w-auto active:scale-95"
                >
                  <Download className="h-4 w-4" /> Export Excel
                </button>
              </div>
            </div>

            {/* SUMMARY WIDGETS (EXECUTIVE DASHBOARD) no-print */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8 no-print">
              <div className="bg-white dark:bg-[#1E1915] p-5 rounded-2xl border border-amber-200/60 dark:border-[#3D3127] flex items-center justify-between shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-100/40 to-transparent dark:from-emerald-900/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                  <p className="text-xs font-bold text-gray-400 dark:text-[#8E8072] uppercase tracking-wider">Total Penjualan</p>
                  <p className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{formatIDR(totalPenjualan)}</p>
                </div>
                <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 border border-emerald-100 dark:border-emerald-800"><TrendingUp size={28} /></div>
              </div>
              <div className="bg-white dark:bg-[#1E1915] p-5 rounded-2xl border border-amber-200/60 dark:border-[#3D3127] flex items-center justify-between shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-100/40 to-transparent dark:from-red-900/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                  <p className="text-xs font-bold text-gray-400 dark:text-[#8E8072] uppercase tracking-wider">Total Pengeluaran</p>
                  <p className="text-2xl font-black mt-1 text-red-600 dark:text-red-400">{formatIDR(totalPengeluaran)}</p>
                </div>
                <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs bg-red-50 dark:bg-red-900/40 text-red-600 border border-red-100 dark:border-red-800"><CreditCard size={28} /></div>
              </div>
              <div className="bg-white dark:bg-[#1E1915] p-5 rounded-2xl border border-amber-200/60 dark:border-[#3D3127] flex items-center justify-between shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#8B5E3C]/10 to-transparent dark:from-amber-900/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                  <p className="text-xs font-bold text-gray-400 dark:text-[#8E8072] uppercase tracking-wider">Laba Bersih Akhir</p>
                  <p className="text-2xl font-black mt-1 text-[#8B5E3C] dark:text-[#FAF5ED]">{formatIDR(labaSetelahPajak)}</p>
                </div>
                <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs bg-[#FDF3E4] text-[#8B5E3C] border border-amber-200/60 dark:border-amber-800"><DollarSign size={28} /></div>
              </div>
            </div>

            {/* STRUKTUR TABEL LABA RUGI FORMAL SESUAI DOKUMEN KLIEN */}
            <div className="w-full rounded-2xl border border-amber-200/60 dark:border-[#3D3127] bg-white dark:bg-[#231C17] shadow-sm overflow-hidden flex-1">
              
              {/* JUDUL CETAK DI DALAM KOTAK */}
              <div className="text-center py-6 border-b border-amber-200/60 dark:border-[#3D3127] bg-[#FAF7F2]/50 dark:bg-[#1E1915]">
                <h2 className="text-xl font-black uppercase text-gray-800 dark:text-[#FAF5ED] tracking-widest">WARUNG CANGKRUK</h2>
                <h3 className="text-lg font-bold text-gray-700 dark:text-[#E5D8C9] mt-1">LABA RUGI</h3>
                <p className="text-sm font-medium text-gray-500 dark:text-[#8E8072] mt-1">Periode {data.periode}</p>
              </div>

              <div className="w-full overflow-x-auto print-table">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-[#8B5E3C] dark:bg-[#35291F] text-white dark:text-[#E5D8C9] font-bold text-sm tracking-wide">
                    <tr>
                      <th className="py-4 px-6 text-center border-r border-[#A87B56] dark:border-[#4A3A30]">Nama Akun</th>
                      <th className="py-4 px-6 text-center w-48 border-r border-[#A87B56] dark:border-[#4A3A30]">Transaksi</th>
                      <th className="py-4 px-6 text-center w-24">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* PENJUALAN */}
                    <TableRow label="PENJUALAN" isEmpty={true} isHeader={true} isBold={true} />
                    <TableRow label="Pendapatan Bar" value={data.pendapatanBar} />
                    <TableRow label="Pendapatan Dapur" value={data.pendapatanDapur} />
                    <TableRow label="Pendapatan Trekking" value={data.pendapatanTrekking} />
                    <TableRow label="TOTAL PENJUALAN" value={totalPenjualan} isBold={true} />
                    
                    {/* HPP */}
                    <TableRow label="" isEmpty={true} />
                    <TableRow label="Harga Pokok Penjualan Dapur" value={data.hppDapur} />
                    <TableRow label="Harga Pokok Penjualan Bar" value={data.hppBar} />
                    <TableRow label="Harga Pokok Penjualan Trekking" value={data.hppTrekking} />
                    <TableRow label="JUMLAH HARGA POKOK PENJUALAN" value={jumlahHpp} isBold={true} />
                    
                    {/* LABA KOTOR */}
                    <TableRow label="" isEmpty={true} />
                    <TableRow label="LABA (RUGI) KOTOR" value={labaKotor} isBold={true} isHeader={true} />
                    
                    {/* BEBAN OPERASIONAL */}
                    <TableRow label="" isEmpty={true} />
                    <TableRow label="BEBAN OPERASIONAL" isEmpty={true} isHeader={true} isBold={true} />
                    <TableRow label="Biaya Gaji" value={data.biayaGaji} />
                    <TableRow label="Perlengkapan Warung" value={data.perlengkapanWarung} />
                    <TableRow label="Biaya kerugian bahan baku" value={data.kerugianBahanBaku} />
                    <TableRow label="Biaya Administrasi Bank" value={data.adminBank} />
                    <TableRow label="Biaya Operasional Warung" value={data.operasionalWarung} />
                    <TableRow label="Biaya Sewa" value={data.biayaSewa} />
                    <TableRow label="Biaya Perbaikan Inventaris Peralatan Warung" value={data.perbaikanInventaris} />
                    <TableRow label="Biaya Perbaikan Dan Pemeliharaan Warung" value={data.pemeliharaanWarung} />
                    <TableRow label="Biaya Marketing" value={data.biayaMarketing} />
                    <TableRow label="Biaya Lain-Lain" value={data.biayaLainLain} />
                    <TableRow label="Biaya Pajak" value={data.biayaPajak} />
                    <TableRow label="Wifi, Listrik Dan Air" value={data.utilitas} />
                    <TableRow label="TOTAL BEBAN OPERASIONAL" value={totalBebanOperasional} isBold={true} />
                    
                    {/* LABA SETELAH BEBAN */}
                    <TableRow label="" isEmpty={true} />
                    <TableRow label="LABA (RUGI) USAHA SETELAH BEBAN" value={labaUsahaSetelahBeban} isBold={true} isHeader={true} />
                    
                    {/* BEBAN LAIN */}
                    <TableRow label="" isEmpty={true} />
                    <TableRow label="BEBAN LAIN" isEmpty={true} isHeader={true} isBold={true} />
                    <TableRow label="JUMLAH BIAYA LAIN-LAIN" value={jumlahBebanLain} isBold={true} />
                    <TableRow label="Jumlah (Beban) Dan Pendapatan Lain-Lain" value={jumlahBebanLain} isBold={true} />
                    
                    {/* SEBELUM & SETELAH PAJAK */}
                    <TableRow label="" isEmpty={true} />
                    <TableRow label="LABA (RUGI) SEBELUM PAJAK" value={labaSebelumPajak} isBold={true} isHeader={true} />
                    <TableRow label="PAJAK PENGHASILAN" value={data.pajakPenghasilan} isBold={true} />
                    <TableRow label="LABA (RUGI) SETELAH PAJAK" value={labaSetelahPajak} isBold={true} isHeader={true} />
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL INPUT SELURUH OPEX */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 modal-backdrop transition-all">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-amber-200/60 dark:border-[#45372E] dark:bg-[#2C231D] animate-in zoom-in-95 scrollbar-hide">
            
            <div className="flex flex-col items-center text-center mb-8 relative">
                <button type="button" onClick={() => setIsModalOpen(false)} className="absolute right-0 top-0 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-[#35291F] text-gray-500 transition" aria-label="Tutup">
                    <X className="w-5 h-5" />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-[#D9A978]/15 dark:bg-amber-400/10 text-[#8B5E3C] dark:text-amber-400 flex items-center justify-center mb-3 shadow-inner">
                    <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-extrabold text-gray-800 dark:text-[#FAF5ED]">
                    Input Data Beban Operasional
                </h2>
                <p className="text-xs text-gray-500 dark:text-[#A89B8C] mt-1">
                    Sesuaikan nilai Beban/OPEX untuk Bulan <strong>{new Date(selectedDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</strong>
                </p>
            </div>

            <form onSubmit={handleSaveOpex}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                
                {/* Kolom Kiri */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#C5B8A8] mb-1.5 ml-1">Biaya Gaji</label>
                    <input type="text" value={opexInputs.biayaGaji} onChange={(e) => handleInputChange('biayaGaji', e.target.value)} className="w-full bg-white border border-amber-200/60 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#C5B8A8] mb-1.5 ml-1">Perlengkapan Warung</label>
                    <input type="text" value={opexInputs.perlengkapanWarung} onChange={(e) => handleInputChange('perlengkapanWarung', e.target.value)} className="w-full bg-white border border-amber-200/60 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#C5B8A8] mb-1.5 ml-1">Biaya Administrasi Bank</label>
                    <input type="text" value={opexInputs.adminBank} onChange={(e) => handleInputChange('adminBank', e.target.value)} className="w-full bg-white border border-amber-200/60 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#C5B8A8] mb-1.5 ml-1">Biaya Operasional Warung</label>
                    <input type="text" value={opexInputs.operasionalWarung} onChange={(e) => handleInputChange('operasionalWarung', e.target.value)} className="w-full bg-white border border-amber-200/60 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#C5B8A8] mb-1.5 ml-1">Biaya Sewa</label>
                    <input type="text" value={opexInputs.biayaSewa} onChange={(e) => handleInputChange('biayaSewa', e.target.value)} className="w-full bg-white border border-amber-200/60 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#C5B8A8] mb-1.5 ml-1">Biaya Perbaikan Inventaris Peralatan</label>
                    <input type="text" value={opexInputs.perbaikanInventaris} onChange={(e) => handleInputChange('perbaikanInventaris', e.target.value)} className="w-full bg-white border border-amber-200/60 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]" />
                  </div>
                </div>

                {/* Kolom Kanan */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#C5B8A8] mb-1.5 ml-1">Pemeliharaan Warung</label>
                    <input type="text" value={opexInputs.pemeliharaanWarung} onChange={(e) => handleInputChange('pemeliharaanWarung', e.target.value)} className="w-full bg-white border border-amber-200/60 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#C5B8A8] mb-1.5 ml-1">Biaya Marketing</label>
                    <input type="text" value={opexInputs.biayaMarketing} onChange={(e) => handleInputChange('biayaMarketing', e.target.value)} className="w-full bg-white border border-amber-200/60 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#C5B8A8] mb-1.5 ml-1">Biaya Lain-Lain</label>
                    <input type="text" value={opexInputs.biayaLainLain} onChange={(e) => handleInputChange('biayaLainLain', e.target.value)} className="w-full bg-white border border-amber-200/60 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#C5B8A8] mb-1.5 ml-1">Biaya Pajak (OPEX)</label>
                    <input type="text" value={opexInputs.biayaPajak} onChange={(e) => handleInputChange('biayaPajak', e.target.value)} className="w-full bg-white border border-amber-200/60 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#C5B8A8] mb-1.5 ml-1">Wifi, Listrik Dan Air</label>
                    <input type="text" value={opexInputs.utilitas} onChange={(e) => handleInputChange('utilitas', e.target.value)} className="w-full bg-white border border-amber-200/60 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none dark:border-[#4A3A30] dark:bg-[#1E1915] dark:text-[#FAF5ED]" />
                  </div>
                  <div className="p-3 border border-amber-200/60 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1915]">
                    <div className="mb-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8B5E3C] dark:text-amber-400 mb-1.5 ml-1">Jumlah Biaya Lain-Lain</label>
                        <input type="text" value={opexInputs.bebanLainLain} onChange={(e) => handleInputChange('bebanLainLain', e.target.value)} className="w-full bg-white border border-amber-200/60 rounded-xl px-4 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8B5E3C] dark:text-amber-400 mb-1.5 ml-1">Pajak Penghasilan</label>
                        <input type="text" value={opexInputs.pajakPenghasilan} onChange={(e) => handleInputChange('pajakPenghasilan', e.target.value)} className="w-full bg-white border border-amber-200/60 rounded-xl px-4 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] outline-none" />
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-5 mt-2 border-t border-amber-200/60 dark:border-[#45372E] sticky bottom-0 bg-white dark:bg-[#2C231D] pb-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-full bg-[#FAF7F2] border border-amber-200/60 font-bold text-sm text-gray-700 hover:bg-[#F2ECE4] transition dark:border-[#4A3A30] dark:text-[#E5D8C9]">Batal</button>
                <button type="submit" className="flex items-center justify-center gap-2 rounded-full bg-[#8B5E3C] px-8 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#6F4E37] transition active:scale-95"><Save className="h-4 w-4" /> Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}