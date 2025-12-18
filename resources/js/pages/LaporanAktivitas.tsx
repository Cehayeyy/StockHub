import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { useState } from 'react';
import { Download, Calendar, Search } from 'lucide-react';

// Tipe data Log
interface ActivityLog {
  id: number;
  username: string | null;
  name: string | null;
  role: string | null;
  activity: string;
  description: string | null;
  created_at: string;
}

// Tipe data Pagination dari Laravel
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
  logs: PaginatedLogs; // Menggunakan tipe pagination
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

  // Filter Logic
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

      <div className="space-y-6">
        <div className="rounded-3xl bg-[#FFFFFF] p-8 shadow-inner">
          <div className="rounded-3xl bg-[#FFFFFF] p-6 shadow">

            {/* --- HEADER & FILTER --- */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-semibold text-[#8B5E3C]"></h2>

              <form onSubmit={handleFilterSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
                {/* Download Button */}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-full bg-[#F3CFA2] px-5 py-2 text-sm font-medium text-[#7A4A2B] shadow-sm hover:bg-[#ddb37f] transition-colors"
                >
                  <Download className="h-4 w-4" />
                  unduh .xls
                </button>

                {/* Date Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCalendar((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#F3CFA2] px-5 py-2 text-sm font-medium text-[#7A4A2B] shadow-sm hover:bg-[#e8c393] transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    {displayFilterDate}
                  </button>
                  {showCalendar && (
                    <div className="absolute right-0 mt-2 rounded-2xl bg-[#E7BE8B] p-3 shadow-lg z-20 animate-in fade-in zoom-in-95 duration-200">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className="rounded-md border border-[#D4A574] px-2 py-1 text-sm bg-white focus:ring-[#8B5E3C] focus:border-[#8B5E3C]"
                      />
                    </div>
                  )}
                </div>

                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search...."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-52 rounded-full border border-[#E5C39C] bg-[#FDF3E4] px-4 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#E5C39C]"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#C38E5F] hover:bg-[#F0DFCA] transition-colors"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* --- TABEL --- */}
            <div className="w-full rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="max-h-[60vh] w-full overflow-auto">
                <table className="w-full whitespace-nowrap text-left text-sm">
                  <thead className="bg-gray-100 text-xs font-bold uppercase text-gray-700 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-4 w-16 text-center border-b border-gray-200 bg-gray-100">No</th>
                      <th className="px-6 py-4 w-52 border-b border-gray-200 bg-gray-100">Waktu</th>
                      <th className="px-6 py-4 w-40 border-b border-gray-200 bg-gray-100">Pengguna</th>
                      <th className="px-6 py-4 w-40 border-b border-gray-200 bg-gray-100">Aktifitas</th>
                      <th className="px-6 py-4 border-b border-gray-200 bg-gray-100">Keterangan</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {logs.data.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-medium">
                          Belum ada aktifitas.
                        </td>
                      </tr>
                    ) : (
                      logs.data.map((log, index) => (
                        <tr key={log.id} className="hover:bg-[#FFF9F0] transition-colors duration-150">
                          <td className="px-6 py-4 text-center align-top text-gray-500">
                            {/* Hitung nomor urut: (halaman_skrg - 1) * per_page + index + 1 */}
                            {(logs.current_page - 1) * logs.per_page + index + 1}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">
                                {new Date(log.created_at).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="text-xs text-gray-500 mt-0.5">
                                {new Date(log.created_at).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }).replace(/\./g, ':')} WIB
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="font-medium text-gray-900">
                              {log.name || log.username || '-'}
                            </div>
                            {log.name && log.username && (
                              <div className="text-xs text-gray-500">@{log.username}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                              {log.activity}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top text-gray-600 truncate max-w-xs" title={log.description || ''}>
                            {log.description || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- PAGINATION (Mirip Item) --- */}
            {logs.links && logs.links.length > 3 && (
                <div className="flex justify-center mt-6">
                    <div className="flex flex-wrap gap-1">
                        {logs.links.map((link, i) => (
                            <button
                                key={i}
                                disabled={!link.url}
                                onClick={() => {
                                    if (link.url) {
                                        router.get(link.url, { date: selectedDate, search }, { preserveScroll: true, preserveState: true });
                                    }
                                }}
                                className={`
                                    px-3 py-1 border rounded-md text-sm font-medium transition-colors
                                    ${link.active
                                        ? "bg-[#D9A978] text-white border-[#D9A978]"
                                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                    }
                                    ${!link.url ? "opacity-50 cursor-not-allowed bg-gray-100" : ""}
                                `}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                </div>
            )}

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
