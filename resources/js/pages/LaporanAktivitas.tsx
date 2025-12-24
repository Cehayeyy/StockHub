import React, { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { Download, Calendar, Search } from 'lucide-react';

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

  return (
    <AppLayout header="Laporan Aktifitas">
      <Head title="Laporan Aktivitas" />

      <div className="py-6">
        {/* Container Utama: Flex col agar pagination bisa didorong ke bawah (mt-auto) */}
        <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-gray-100 min-h-[600px] flex flex-col">

          {/* --- HEADER & FILTERS --- */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
            <form onSubmit={handleFilterSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center w-full md:w-auto">

              {/* Tombol Download */}
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex justify-center items-center gap-2 rounded-full bg-[#F3CFA2] px-5 py-2 text-sm font-medium text-[#7A4A2B] shadow-sm hover:bg-[#ddb37f] transition-colors w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                unduh .xls
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
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={handleDateChange}
                      className="w-full rounded-md border border-[#D4A574] px-2 py-1 text-sm bg-white focus:ring-[#8B5E3C] focus:border-[#8B5E3C]"
                    />
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Cari user/aktifitas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-64 rounded-full border border-[#E5C39C] bg-[#FDF3E4] pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E5C39C]"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C38E5F] hover:text-[#7A4A2B]"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          {/* --- TABEL DATA --- */}
          <div className="w-full rounded-xl border border-gray-100 bg-white overflow-hidden mb-6">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 border-b border-gray-100">
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
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        Belum ada aktifitas yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    logs.data.map((log, index) => (
                      <tr key={log.id} className="hover:bg-[#FFF9F0] transition-colors duration-150">
                        <td className="px-6 py-4 text-center align-top text-gray-400">
                          {(logs.current_page - 1) * logs.per_page + index + 1}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-700">
                              {new Date(log.created_at).toLocaleDateString('id-ID', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </span>
                            <span className="text-xs text-gray-400 mt-0.5">
                              {new Date(log.created_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit', minute: '2-digit',
                              }).replace(/\./g, ':')} WIB
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="font-medium text-gray-800">
                            {log.name || log.username || '-'}
                          </div>
                          {log.name && log.username && (
                            <div className="text-xs text-gray-400">@{log.username}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border
                              ${
                                log.activity.toLowerCase().includes('delete') || log.activity.toLowerCase().includes('hapus')
                                ? 'bg-red-50 text-red-700 border-red-100'
                                : log.activity.toLowerCase().includes('create') || log.activity.toLowerCase().includes('tambah') || log.activity.toLowerCase().includes('login')
                                ? 'bg-green-50 text-green-700 border-green-100'
                                : log.activity.toLowerCase().includes('update') || log.activity.toLowerCase().includes('edit')
                                ? 'bg-amber-50 text-amber-700 border-amber-100'
                                : 'bg-blue-50 text-blue-700 border-blue-100'
                              }
                          `}>
                            {log.activity}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top text-gray-600">
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

          {/* --- PAGINATION (STYLE SAMA DENGAN ITEM.TSX) --- */}
          {logs.links && logs.links.length > 3 && (
            <div className="mt-auto flex justify-center pt-4">
              <div className="flex gap-1 bg-gray-50 p-1 rounded-full border border-gray-200">
                {logs.links.map((link, i) => {
                  let label = link.label;
                  if (label.includes('&laquo;')) label = 'Prev';
                  if (label.includes('&raquo;')) label = 'Next';

                  return (
                    <button
                      key={i}
                      disabled={!link.url}
                      onClick={() => {
                        if (link.url) {
                          router.get(link.url, { date: selectedDate, search }, { preserveScroll: true, preserveState: true });
                        }
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                        link.active
                          ? "bg-[#D9A978] text-white shadow-md"
                          : "text-gray-600 hover:bg-white hover:text-[#D9A978]"
                      } ${!link.url ? "opacity-50 cursor-not-allowed" : ""}`}
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
