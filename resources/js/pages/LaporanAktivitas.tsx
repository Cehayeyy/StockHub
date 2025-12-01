import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
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
    date?: string;
    search?: string;
  };
  // supaya kompatibel dengan Inertia PageProps
  [key: string]: any;
}

export default function LaporanAktivitas() {
  const { logs, filters } = usePage<PageProps>().props;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(filters.date || '');
  const [search, setSearch] = useState(filters.search || '');

  // Jam realtime (kalau ingin ditampilkan di header, sudah dihandle AppLayout)
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const formattedHeaderDate = currentTime.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedHeaderTime =
    currentTime
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      .replace(/\./g, ':') + ' WIB';

  // Submit filter (tanggal + search)
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (selectedDate) params.set('date', selectedDate);
    if (search) params.set('search', search);

    window.location.href = `/laporan-aktivitas?${params.toString()}`;
  };

  // Tanggal yang ditampilkan di tombol
  const displayFilterDate = selectedDate
    ? new Date(selectedDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : formattedHeaderDate;

  return (
    <AppLayout header="Laporan Aktivitas">
      <Head title="Laporan Aktivitas" />

      <div className="space-y-6">
        {/* Kartu utama (tetap nuansa krem) */}
        <div className="rounded-3xl bg-[#FFFFFF] p-8 shadow-inner">
          <div className="rounded-3xl bg-[#FFFFFF] p-6 shadow">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-semibold text-[#8B5E3C]">
              </h2>

              {/* Bar filter: unduh, tanggal, search */}
              <form
                onSubmit={handleFilterSubmit}
                className="flex flex-col gap-3 md:flex-row md:items-center"
              >
                {/* Tombol Unduh (belum ada fungsi export) */}
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-[#F3CFA2] px-5 py-2 text-sm font-medium text-[#7A4A2B] shadow-sm hover:bg-[#ddb37f]"
                >
                  <Download className="h-4 w-4" />
                  unduh laporan
                </button>

                {/* Tombol tanggal + kalender */}
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
                        onChange={(e) => setSelectedDate(e.target.value)}
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

            {/* TABEL – warna disamakan dengan Manajemen Akun */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="max-h-[48vh] overflow-y-auto">
                <table className="min-w-full table-auto text-left text-sm">
                  <thead className="border-b bg-gray-100 text-xs font-semibold uppercase text-gray-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 w-16 sticky top-0">No</th>
                      <th className="px-4 py-3 w-52 sticky top-0">waktu</th>
                      <th className="px-4 py-3 w-40 sticky top-0">pengguna</th>
                      <th className="px-4 py-3 w-40 sticky top-0">aktifitas</th>
                      <th className="px-4 py-3 sticky top-0">keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-gray-500"
                        >
                          Belum ada aktivitas.
                        </td>
                      </tr>
                    ) : (
                      logs.data.map((log, index) => (
                        <tr
                          key={log.id}
                          className="border-b hover:bg-gray-50"
                        >
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
                            {log.username || '-'}
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
