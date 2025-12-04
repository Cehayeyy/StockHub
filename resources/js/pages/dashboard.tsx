import React, { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { Box, AlertTriangle, Bell, Check, X } from 'lucide-react';
import type { SharedData } from '@/types';

// Tipe props
interface PageProps {
  auth: {
    user: {
      name: string;
    };
  };
}

// Komponen Kartu Info
function InfoCard({ title, value, icon: Icon, countBg }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
       <div className="flex flex-col justify-between h-full gap-2">
          <div className="text-sm text-gray-500 font-medium">{title}</div>

           {/* Icon & Value Logic */}
           {title === 'Total Stok' ? (
                <div className="flex items-center gap-3 mt-1">
                    <div className="w-12 h-12 bg-orange-400 rounded-lg flex items-center justify-center text-white shadow-md">
                         <Box size={24} />
                    </div>
                    <span className="text-4xl font-bold text-gray-800">{value}</span>
                </div>
           ) : title === 'Stok Hampir Habis' ? (
                <div className="flex items-center gap-3 mt-1">
                     <div className="w-12 h-12 bg-[#EBC107] rounded-lg flex items-center justify-center text-white shadow-md">
                         <AlertTriangle size={24} />
                    </div>
                    <span className="text-4xl font-bold text-gray-800">{value}</span>
                </div>
           ) : (
                 <div className="flex items-center gap-3 mt-1">
                     <div className="w-12 h-12 bg-[#5B93FF] rounded-lg flex items-center justify-center text-white shadow-md">
                         <Bell size={24} />
                    </div>
                    <span className="text-4xl font-bold text-gray-800">{value}</span>
                </div>
           )}
       </div>
    </div>
  );
}

export default function Dashboard() {
  const { auth } = usePage<SharedData>().props;

  // State untuk Jam Digital
  const [currentTime, setCurrentTime] = useState(new Date());

  // Efek untuk mengupdate jam setiap detik
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Tanggal: "24 November 2025"
  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Format Jam: "14:30:45 WIB"
  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace('.', ':') + ' WIB'; // Ganti titik dengan titik dua agar format jam standar

  // Data dummy permintaan akses
  const requests = [
    { id: 1, name: 'Bar1', action: 'meminta akses untuk revisi stok harian' },
    { id: 2, name: 'Bar3', action: 'meminta akses untuk revisi stok harian' },
    { id: 3, name: 'Kitchen1', action: 'meminta akses untuk revisi stok harian' },
  ];

  // Header Custom dengan Jam
  const dashboardHeader = (
    <h2 className="font-semibold text-2xl text-gray-800 leading-tight">
      Dasbor
    </h2>
  );


  return (
    <AppLayout header={dashboardHeader}>
      <Head title="Dashboard" />

      <div className="space-y-8">
        {/* Judul Selamat Datang */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Selamat datang, {auth.user.name}
        </h1>

        {/* Grid Kartu Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoCard
            title="Total Stok"
            value="123"
          />
          <InfoCard
            title="Stok Hampir Habis"
            value="10"
          />
          <InfoCard
            title="Riwayat Notifikasi"
            value="3"
          />
        </div>

        {/* Daftar Permintaan Akses Revisi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            Permintaan akses revisi:
          </h3>

          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                {/* Text Kiri */}
                <div className="text-sm text-center sm:text-left">
                  <span className="font-bold text-gray-800">{req.name}</span>
                  <span className="text-gray-600 ml-1">{req.action}</span>
                </div>

                {/* Tombol Kanan (Dibuat Berjarak) */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-end">
                  {/* Tombol Confirm (Hijau) */}
                  <button className="flex items-center justify-center px-6 py-2 bg-[#22C55E] text-white text-sm font-medium rounded-md hover:bg-green-600 transition-colors shadow-sm min-w-[120px]">
                    <Check className="w-4 h-4 mr-2" />
                    Confirm
                  </button>

                  {/* Tombol Tolak (Merah) */}
                  <button className="flex items-center justify-center px-6 py-2 bg-[#EF4444] text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors shadow-sm min-w-[120px]">
                    <X className="w-4 h-4 mr-2" />
                    Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
