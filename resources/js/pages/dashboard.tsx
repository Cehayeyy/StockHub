import React from 'react';
import AppLayout from '../layouts/app-layout'; // <-- Gunakan path relatif
import { Head, usePage } from '@inertiajs/react';
// Ikon untuk konten
import { Box, AlertTriangle, Bell, Check } from 'lucide-react';

// Tipe props
interface PageProps {
  auth: {
    user: {
      name: string;
    };
  };
}

// Komponen Kartu (helper)
function InfoCard({ title, value, icon: Icon, iconBgColor }: any) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 flex items-center">
      <div className={`w-16 h-16 rounded-lg ${iconBgColor} flex items-center justify-center mr-6`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <div>
        <div className="text-sm text-gray-500 font-medium">{title}</div>
        <div className="text-3xl font-bold text-gray-800">{value}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { auth } = usePage<PageProps>().props;

  // Data dummy untuk permintaan
  const requests = [
    { id: 1, name: 'Bar1', action: 'meminta akses untuk menginput stok harian' },
    { id: 2, name: 'Bar3', action: 'meminta akses untuk menginput stok harian' },
    { id: 3, name: 'Kitchen1', action: 'meminta akses untuk menginput stok harian' },
  ];

  return (
    // 1. Gunakan AppLayout
    // 2. Kirim "Dashboard" sebagai prop 'header'
    <AppLayout header="Dashboard">
      <Head title="Dashboard" />

      {/* Judul Selamat Datang */}
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Selamat datang, {auth.user.name}
      </h1>

      {/* Grid Kartu Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <InfoCard
          title="Total Stok"
          value="123"
          icon={Box}
          iconBgColor="bg-orange-400"
        />
        <InfoCard
          title="Stok Hampir Habis"
          value="10"
          icon={AlertTriangle}
          iconBgColor="bg-yellow-500"
        />
        <InfoCard
          title="Riwayat Notifikasi"
          value="3"
          icon={Bell}
          iconBgColor="bg-blue-400"
        />
      </div>

      {/* Daftar Permintaan */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Permintaan hak akses edit:
        </h2>

        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="font-semibold text-gray-700">{req.name}</span>
                <span className="text-gray-600"> {req.action}</span>
              </div>
              <button className="flex items-center px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors">
                <Check className="w-4 h-4 mr-2" />
                Confirm
              </button>
            </div>
          ))}
        </div>
      </div>

    </AppLayout>
  );
}
