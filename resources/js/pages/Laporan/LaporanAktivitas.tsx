import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { Download, Calendar, Search, User, Clock } from 'lucide-react';

// --- Types ---
interface ActivityLog {
  id: number;
  username: string | null;
  name: string | null;
  role: string | null;
  activity: string;
  description: string | null;
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

export default function LaporanAktivitas() {
  const { logs, filters } = usePage<PageProps>().props;

  const [selectedDate, setSelectedDate] = useState(filters.date || '');
  const [search, setSearch] = useState(filters.search || '');
  const [showCalendar, setShowCalendar] = useState(false);

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
    if (act.includes('delete') || act.includes('hapus')) return 'bg-rose-50 text-rose-700 border-rose-100';
    if (act.includes('create') || act.includes('tambah') || act.includes('login')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (act.includes('update') || act.includes('edit')) return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-blue-50 text-blue-700 border-blue-100';
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
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Pemantauan aktivitas dan riwayat tindakan pengguna</p>
            </div>

            <form onSubmit={handleFilterSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center w-full md:w-auto">

              {/* Tombol Download */}
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex justify-center items-center gap-2 rounded-full bg-[#D9A978] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#c4925e] transition-all w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                <span>Unduh .xls</span>
              </button>

              {/* Date Picker */}
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
                      {selectedDate && (
                        <button 
                          type="button"
                          onClick={() => { setSelectedDate(''); setShowCalendar(false); applyFilter('', search); }}
                          className="text-xs text-[#8B5E3C] hover:underline font-bold"
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
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
              logs.data.map((log) => (
                <div key={log.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border shadow-2xs ${getBadgeClass(log.activity)}`}>
                      {log.activity}
                    </span>
                    <div className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" />
                      {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} •
                      {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}
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
                </div>
              ))
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
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {logs.data.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                        Belum ada aktifitas yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    logs.data.map((log, index) => (
                      <tr key={log.id} className="hover:bg-[#FDF3E4]/50 transition-colors duration-150">
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
                      </tr>
                    ))
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
                      className={`px-3 sm:px-4 py-2 rounded-full text-xs font-bold transition-all ${
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