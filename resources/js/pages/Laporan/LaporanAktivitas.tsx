import React, { useState, Fragment } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { Download, Calendar, Search, User, Clock, ChevronDown, ChevronUp, Layers, Activity } from 'lucide-react';
import axios from 'axios';

// --- Types ---
interface ActivityLog {
  id: number;
  username: string | null;
  name: string | null;
  role: string | null;
  activity: string;
  description: string | null;
  details?: any; // Menyimpan JSON object / array detail
  created_at: string;
}

interface PaginatedLogs {
  data: ActivityLog[];
  links: {
    url: string | null;
    label: string;
    active: boolean;
  }[];
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
}

interface PageProps {
  logs: PaginatedLogs;
  filters: {
    date?: string;
    search?: string;
  };
  [key: string]: any;
}

// --- Format Angka Rupiah Pembantu ---
const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(angka);
};

// --- Komponen Pembantu Format Detail Biasa (Non-Login) ---
const RenderDetails: React.FC<{ data: any }> = ({ data }) => {
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return <p className="text-xs text-gray-400 italic">Tidak ada rincian detail tambahan.</p>;
  }

  // 1. FORMAT UNTUK NOTA PENJUALAN (Sales Report)
  if (data.nomor_nota && data.items && Array.isArray(data.items)) {
    return (
      <div className="space-y-3">
        {/* Info Nota */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
          <div>
            <div className="text-[10px] font-bold text-amber-700/60 uppercase">Nomor Nota</div>
            <div className="text-xs font-bold text-amber-900 mt-0.5">{data.nomor_nota}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-amber-700/60 uppercase">Partner</div>
            <div className="text-xs font-bold text-amber-900 mt-0.5">{data.partner || '-'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-amber-700/60 uppercase">Diskon</div>
            <div className="text-xs font-bold text-amber-900 mt-0.5">{data.diskon ? `${data.diskon}%` : '0%'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-amber-700/60 uppercase">Total Bayar</div>
            <div className="text-xs font-bold text-emerald-600 mt-0.5">{formatRupiah(data.total_bayar || 0)}</div>
          </div>
        </div>

        {/* Tabel Rincian Menu yang Dijual */}
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-left text-xs bg-white">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2 w-8 text-center">No</th>
                <th className="px-3 py-2">Nama Menu</th>
                <th className="px-3 py-2 text-right">Harga</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.items.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2 text-center text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2 font-semibold text-gray-700">{item.nama_item || item.name || '-'}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{formatRupiah(item.harga || 0)}</td>
                  <td className="px-3 py-2 text-right font-bold text-gray-700">{item.jumlah || item.qty} {item.satuan || 'porsi'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                    {formatRupiah((item.harga || 0) * (item.jumlah || item.qty || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 2. FORMAT UNTUK ARRAY ITEMS (Borongan Mentah / Kerugian)
  const itemList = Array.isArray(data) ? data : (data.items && Array.isArray(data.items) ? data.items : null);
  if (itemList) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-left text-xs bg-white">
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="px-3 py-2 w-8 text-center">No</th>
              <th className="px-3 py-2">Item / Bahan</th>
              <th className="px-3 py-2 text-right">Perubahan / Jumlah</th>
              {itemList[0]?.alasan && <th className="px-3 py-2">Alasan</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {itemList.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="px-3 py-2 text-center text-gray-400">{idx + 1}</td>
                <td className="px-3 py-2 font-semibold text-gray-700">
                  {item.nama_item || item.item_name || item.nama || item.name || '-'}
                </td>
                <td className="px-3 py-2 text-right font-bold text-emerald-600">
                  {item.stok_masuk ? `+${item.stok_masuk}` : (item.jumlah || item.qty || 0)} {item.satuan || ''}
                </td>
                {item.alasan && (
                  <td className="px-3 py-2 text-gray-500 italic truncate max-w-[150px]">{item.alasan}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // 3. FORMAT UNTUK KEY-VALUE OBJECT BIASA (Verifikasi, Edit Manual, Update Menu)
  if (typeof data === 'object') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.entries(data).map(([key, value], idx) => {
          if (typeof value === 'object' && value !== null) return null; // Skip jika ada nested yg belum tertangkap
          
          // 🔥 1. FILTER UNTUK MENYEMBUNYIKAN IP ADDRESS 🔥
          const lowerKey = key.toLowerCase();
          if (lowerKey === 'ip_address' || lowerKey === 'ip address' || lowerKey === 'ip') {
            return null; // Skip (tidak di-render)
          }
          
          // Percantik nama label
          const cleanKey = key.replace(/_/g, ' ');

          // 🔥 2. BONUS FIX: Merapikan angka durasi sesi yang terlalu panjang / minus
          let displayValue = String(value);
          if (lowerKey.includes('durasi')) {
            const extractedNum = parseFloat(displayValue.replace(/[^\d.-]/g, ''));
            if (!isNaN(extractedNum)) {
               displayValue = Math.abs(extractedNum).toFixed(2) + ' menit'; // Jadikan absolut (positif) dan 2 angka di belakang koma
            }
          }
          
          return (
            <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{cleanKey}</div>
              <div className={`text-xs font-semibold mt-1 ${lowerKey.includes('status') ? (value === 'Disetujui' ? 'text-emerald-600' : (value === 'Ditolak' ? 'text-rose-600' : 'text-amber-600')) : 'text-gray-800'}`}>
                {displayValue}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback (Jika berbentuk string murni)
  return <p className="text-xs text-gray-600">{String(data)}</p>;
};

export default function LaporanAktivitas() {
  const { logs, filters } = usePage<PageProps>().props;

  const [selectedDate, setSelectedDate] = useState(filters.date || '');
  const [search, setSearch] = useState(filters.search || '');
  const [showCalendar, setShowCalendar] = useState(false);
  
  // --- States untuk fitur Expand & Fetching Sesi Login ---
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sessionData, setSessionData] = useState<Record<number, { activities: any[], logout_time: string | null }>>({});
  const [loadingSession, setLoadingSession] = useState<number | null>(null);

  const toggleExpand = async (log: ActivityLog) => {
    // Jika diklik baris yang sama, tutup
    if (expandedId === log.id) {
      setExpandedId(null);
      return;
    }
    
    // Buka baris
    setExpandedId(log.id);

    // Cek apakah ini aktivitas "Login" dan datanya belum pernah di-fetch dari database
    if (log.activity.toLowerCase().includes('login') && !sessionData[log.id]) {
      setLoadingSession(log.id);
      try {
        const response = await axios.get(`/laporan-aktivitas/${log.id}/session`);
        setSessionData(prev => ({ ...prev, [log.id]: response.data }));
      } catch (error) {
        console.error("Gagal mengambil detail sesi", error);
      } finally {
        setLoadingSession(null);
      }
    }
  };

  // --- Handlers ---
  const applyFilter = (dateValue: string, searchValue: string) => {
    router.get(
      route('laporan-aktivitas'),
      { date: dateValue, search: searchValue },
      { preserveScroll: true, preserveState: true }
    );
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilter(selectedDate, search);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSelectedDate(value);
    applyFilter(value, search);
  };

  const handleDownload = () => {
    const params = new URLSearchParams();
    if (selectedDate) params.set('date', selectedDate);
    if (search) params.set('search', search);
    window.location.href = `/laporan-aktivitas/export?${params.toString()}`;
  };

  const displayFilterDate = selectedDate
    ? new Date(selectedDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Pilih tanggal';

  // Helper untuk warna badge
  const getBadgeClass = (activity: string) => {
    const act = activity.toLowerCase();
    if (act.includes('delete') || act.includes('hapus') || act.includes('reject') || act.includes('tolak')) return 'bg-rose-50 text-rose-700 border-rose-100';
    if (act.includes('create') || act.includes('tambah') || act.includes('login') || act.includes('approve') || act.includes('setuju')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (act.includes('update') || act.includes('edit') || act.includes('koreksi')) return 'bg-amber-50 text-amber-700 border-amber-100';
    if (act.includes('logout') || act.includes('keluar')) return 'bg-gray-100 text-gray-600 border-gray-200';
    return 'bg-blue-50 text-blue-700 border-blue-100';
  };

  // --- RENDER CONTENT SLIDE DOWN ---
  const renderSlideDownContent = (log: ActivityLog) => {
    const isLoginEvent = log.activity.toLowerCase().includes('login');

    if (isLoginEvent) {
      if (loadingSession === log.id) {
        return <div className="text-center text-xs text-gray-500 py-6 animate-pulse">Menelusuri riwayat aktivitas selama sesi ini...</div>;
      }
      
      const session = sessionData[log.id];
      if (session && session.activities.length > 0) {
        return (
          <div className="relative pt-2 pb-2">
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Timeline Aktivitas Sesi Ini</h4>
            <div className="border-l-2 border-[#D9A978] ml-2 pl-4 py-1 space-y-5">
              {session.activities.map((act) => (
                <div key={act.id} className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-[#8B5E3C] rounded-full border-2 border-white shadow-xs"></div>
                  <div className="text-xs font-bold text-gray-800">{act.activity}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    <span className="font-semibold text-gray-600">{new Date(act.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')} WIB</span> &mdash; {act.description}
                  </div>
                  {/* 🔥 TAMBAHKAN RENDER DETAIL DI SINI AGAR MUNCUL DI DALAM TIMELINE LOGIN 🔥 */}
                  {act.details && (
                     <div className="mt-2 pl-1 max-w-2xl">
                         <RenderDetails data={act.details} />
                     </div>
                  )}
                </div>
              ))}
              
              {/* Indikator Logout / Aktif */}
              <div className="relative pt-2">
                 <div className="absolute -left-[21px] top-3 w-2.5 h-2.5 bg-gray-300 rounded-full border-2 border-white"></div>
                 {session.logout_time ? (
                    <div className="text-[11px] font-bold text-gray-500 italic mt-1">Sesi berakhir (Logout pada {new Date(session.logout_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')} WIB)</div>
                 ) : (
                    <div className="text-[11px] font-bold text-emerald-600 italic mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Sesi ini masih aktif (belum logout)
                    </div>
                 )}
              </div>
            </div>
          </div>
        );
      }
      
      return (
        <div className="text-xs text-gray-400 italic py-2">
          User tidak melakukan aktivitas perubahan data apapun setelah login ini 
          {session?.logout_time && ` sampai logout pada ${new Date(session.logout_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')} WIB`}.
        </div>
      );
    }

    // Jika bukan log "Login", tampilkan detail standar JSON
    return (
      <>
        <div className="flex items-center gap-2 mb-3 text-[#8B5E3C] font-bold text-xs uppercase tracking-wider border-b border-gray-100 pb-2">
          <Layers className="w-4 h-4" />
          <span>Rincian Detail Aktivitas</span>
        </div>
        <RenderDetails data={log.details} />
      </>
    );
  };

  return (
    <AppLayout header="Laporan Aktifitas">
      <Head title="Laporan Aktivitas" />

      <div className="py-6">
        {/* Container Utama */}
        <div className="bg-[#F2ECE4] p-4 md:p-8 rounded-3xl shadow-sm border border-amber-200/60 min-h-[600px] flex flex-col">

          {/* --- HEADER & FILTERS --- */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Laporan Aktivitas Sistem</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Pemantauan aktivitas dan riwayat tindakan pengguna (Klik baris untuk detail)</p>
            </div>

            <form onSubmit={handleFilterSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center w-full md:w-auto">

              {/* Tombol Download */}
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex justify-center items-center gap-2 rounded-full bg-[#D9A978] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#c4925e] transition-all w-full sm:w-auto cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Export Excel</span>
              </button>

              {/* Date Picker */}
              <div className="relative w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowCalendar((v) => !v)}
                  className="inline-flex justify-between sm:justify-center items-center gap-2 rounded-full bg-white border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition-all w-full sm:w-auto cursor-pointer"
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
                      {selectedDate && (
                        <button 
                          type="button"
                          onClick={() => { setSelectedDate(''); setShowCalendar(false); applyFilter('', search); }}
                          className="text-xs text-[#8B5E3C] hover:underline font-bold cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={handleDateChange}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm font-medium focus:ring-2 focus:ring-[#8B5E3C] outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Cari user/aktifitas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-64 rounded-full border border-gray-200 bg-gray-50 pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                />
                <button
                  type="submit"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          {/* --- MOBILE VIEW (CARDS) --- */}
          <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
            {logs.data.length === 0 ? (
              <div className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                Belum ada aktifitas yang tercatat.
              </div>
            ) : (
              logs.data.map((log) => {
                const isExpanded = expandedId === log.id;
                return (
                  <div 
                    key={log.id} 
                    onClick={() => toggleExpand(log)}
                    className={`bg-white border transition-all duration-200 rounded-2xl p-4 shadow-xs cursor-pointer ${
                      isExpanded ? 'border-[#D9A978] ring-2 ring-[#D9A978]/20' : 'border-gray-100 hover:border-amber-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border shadow-2xs ${getBadgeClass(log.activity)}`}>
                        {log.activity}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#8B5E3C]" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>

                    <div className="flex items-start gap-3 mb-2">
                      <div className="bg-gray-100 p-2.5 rounded-2xl">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-sm">
                          {log.name || log.username || '-'}
                        </div>
                        {log.username && <div className="text-xs text-gray-400 font-medium">@{log.username}</div>}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-100 leading-relaxed font-medium">
                      <span className="font-bold text-gray-400 uppercase text-[10px] block mb-1">Keterangan:</span>
                      {log.description || '-'}
                    </div>

                    {/* SLIDE DOWN DETAILS (MOBILE) */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-dashed border-amber-200 animate-in fade-in slide-in-from-top-1 cursor-default" onClick={e => e.stopPropagation()}>
                        {renderSlideDownContent(log)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* --- DESKTOP VIEW (TABLE) --- */}
          <div className="hidden md:block w-full rounded-2xl border border-gray-100 bg-white shadow-xs overflow-hidden flex-1 mb-6">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#FAF7F2]/80 text-gray-500 font-bold uppercase text-[11px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 w-16 text-center">No</th>
                    <th className="px-6 py-4 w-48">Waktu</th>
                    <th className="px-6 py-4 w-48">Pengguna</th>
                    <th className="px-6 py-4 w-32 text-center">Aktifitas</th>
                    <th className="px-6 py-4 min-w-[300px]">Keterangan</th>
                    <th className="px-4 py-4 w-12 text-center"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {logs.data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                        Belum ada aktifitas yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    logs.data.map((log, index) => {
                      const isExpanded = expandedId === log.id;
                      return (
                        <Fragment key={log.id}>
                          {/* BARIS UTAMA (BISA DIKLIK) */}
                          <tr 
                            onClick={() => toggleExpand(log)}
                            className={`cursor-pointer transition-colors duration-150 ${
                              isExpanded ? 'bg-[#FDF3E4]' : 'hover:bg-[#FDF3E4]/50'
                            }`}
                          >
                            <td className="px-6 py-4 text-center align-top text-gray-400 font-medium">
                              {(logs.current_page - 1) * logs.per_page + index + 1}
                            </td>
                            <td className="px-6 py-4 align-top">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-800">
                                  {new Date(log.created_at).toLocaleDateString('id-ID', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                  })}
                                </span>
                                <span className="text-xs text-gray-400 font-medium mt-0.5">
                                  {new Date(log.created_at).toLocaleTimeString('id-ID', {
                                    hour: '2-digit', minute: '2-digit',
                                  }).replace(/\./g, ':')} WIB
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <div className="font-bold text-gray-800">
                                {log.name || log.username || '-'}
                              </div>
                              {log.name && log.username && (
                                <div className="text-xs text-gray-400 font-medium">@{log.username}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 align-top text-center">
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border shadow-2xs ${getBadgeClass(log.activity)}`}>
                                {log.activity}
                              </span>
                            </td>
                            <td className="px-6 py-4 align-top text-gray-600 font-medium">
                              <div className="whitespace-normal leading-relaxed">
                                {log.description || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top text-center text-gray-400">
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-[#8B5E3C] inline transition-transform" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-300 hover:text-gray-500 inline transition-transform" />
                              )}
                            </td>
                          </tr>

                          {/* BARIS DETAIL SLIDE-DOWN (EXPANDED) */}
                          {isExpanded && (
                            <tr className="bg-[#FAF7F2]/90 border-b border-amber-100/80">
                              <td colSpan={6} className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                <div className="bg-white rounded-2xl p-4 border border-amber-200/60 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200 cursor-default">
                                  {renderSlideDownContent(log)}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* --- PAGINATION --- */}
          {logs.links && logs.links.length > 3 && (
            <div className="mt-auto flex justify-center pt-4 pb-2">
              <div className="flex flex-wrap justify-center gap-1 bg-white p-1 rounded-full border border-gray-100 shadow-xs">
                {logs.links.map((link, i) => {
                  let label = link.label;
                  if (label.includes('&laquo;')) label = 'Prev';
                  if (label.includes('&raquo;')) label = 'Next';

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!link.url}
                      onClick={() => {
                        if (link.url) {
                          router.get(link.url, { date: selectedDate, search }, { preserveScroll: true, preserveState: true });
                        }
                      }}
                      className={`px-3 sm:px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        link.active
                          ? "bg-[#D9A978] text-white shadow-xs"
                          : "text-gray-600 hover:bg-gray-50 hover:text-[#8B5E3C]"
                      } ${!link.url ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
                      dangerouslySetInnerHTML={{ __html: label }}
                    />
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}