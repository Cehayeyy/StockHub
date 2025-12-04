import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Download, Calendar, Search } from 'lucide-react';

interface ActivityLog {
  id: number;
  username: string | null;
  name: string | null;
  role: string | null;
  activity: string;
  description: string | null;
  created_at: string;
}

interface PageProps {
  logs: {
    data: ActivityLog[];
    links: any[];
  };
  filters: {
    date?: string; // YYYY-MM-DD
    search?: string;
  };
  [key: string]: any;
}

export default function LaporanAktivitas() {
  const { logs, filters } = usePage<PageProps>().props;

  const [selectedDate, setSelectedDate] = useState(filters.date || '');
  const [search, setSearch] = useState(filters.search || '');
  const [showCalendar, setShowCalendar] = useState(false);

  // Ubah URL sesuai filter (dipakai untuk date & search)
  const applyFilter = (dateValue: string, searchValue: string) => {
    const params = new URLSearchParams();
    if (dateValue) params.set('date', dateValue);
    if (searchValue) params.set('search', searchValue);

    window.location.href = `/laporan-aktivitas?${params.toString()}`;
  };

  // Submit search
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilter(selectedDate, search);
  };

  // Ganti tanggal → langsung filter
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value; // YYYY-MM-DD
    setSelectedDate(value);
    applyFilter(value, search);
  };

  // Tombol unduh .xls (ikut filter tanggal & search)
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
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-semibold text-[#8B5E3C]">
              </h2>

              <form
                onSubmit={handleFilterSubmit}
                className="flex flex-col gap-3 md:flex-row md:items-center"
              >
                {/* Tombol unduh .xls */}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-full bg-[#F3CFA2] px-5 py-2 text-sm font-medium text-[#7A4A2B] shadow-sm hover:bg-[#ddb37f]"
                >
                  <Download className="h-4 w-4" />
                  unduh .xls
                </button>

                {/* Tombol tanggal + picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCalendar((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#F3CFA2] px-5 py-2 text-sm font-medium text-[#7A4A2B] shadow-sm hover:bg-[#e8c393]"
                  >
                    <Calendar className="h-4 w-4" />
                    {displayFilterDate}
                  </button>

                  {showCalendar && (
                    <div className="absolute right-0 mt-2 rounded-2xl bg-[#E7BE8B] p-3 shadow-lg z-20">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className="rounded-md border border-[#D4A574] px-2 py-1 text-sm bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* Search box */}
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#C38E5F] hover:bg-[#F0DFCA]"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* TABEL */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="max-h-[48vh] overflow-y-auto">
                <table className="min-w-full table-auto text-left text-sm">
                  <thead className="border-b bg-gray-100 text-xs font-semibold uppercase text-gray-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 w-16">No</th>
                      <th className="px-4 py-3 w-52">waktu</th>
                      <th className="px-4 py-3 w-40">pengguna</th>
                      <th className="px-4 py-3 w-40">aktifitas</th>
                      <th className="px-4 py-3">keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-gray-500"
                        >
                          Belum ada aktifitas.
                        </td>
                      </tr>
                    ) : (
                      logs.data.map((log, index) => (
                        <tr key={log.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 align-top">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 align-top text-[13px]">
                            {new Date(log.created_at).toLocaleDateString(
                              'id-ID',
                              {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              }
                            )}
                            <br />
                            <span className="text-xs text-gray-600">
                              {new Date(log.created_at)
                                .toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                                .replace(/\./g, ':')}{' '}
                              WIB
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            {log.name && log.username
                              ? `${log.name} (${log.username})`
                              : log.username || log.name || '-'}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {log.activity}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {log.description || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* END TABEL */}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
