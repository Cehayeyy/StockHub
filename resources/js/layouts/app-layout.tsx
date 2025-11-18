import React, { PropsWithChildren, useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
// Ikon-ikon
import {
  LayoutDashboard,
  Users,
  Box,
  ClipboardList,
  ClipboardCheck,
  FileText,
  LogOut,
  Bell,
  CheckCircle2
} from 'lucide-react';

// Tentukan tipe props halaman
interface PageProps {
  auth: {
    user: {
      name: string;
      email: string;
    };
  };
  flash?: { // <-- Dibuat opsional
    login_success?: string;
  };
}

// Tipe props untuk layout, tambahkan 'header'
interface LayoutProps {
  header?: React.ReactNode;
  children: React.ReactNode;
}

// --- INI KOMPONEN YANG DIPERBAIKI UNTUK ERROR ZIGGY ---
function SidebarLink({ href, icon: Icon, children }: { href: string, icon: React.ElementType, children: React.ReactNode }) {
  let isActive = false;
  let url = '#'; // Default URL jika rute tidak ada

  // Cek apakah href adalah nama rute yang valid
  if (href !== '#') {
    try {
      // route().has() mengecek apakah rute ada di daftar Ziggy
      if (route().has(href)) {
        isActive = route().current(href);
        url = route(href);
      } else {
        // Jika rute tidak ada (misal 'manajemen.akun' belum dibuat)
        console.warn(`Rute "${href}" tidak ditemukan. Menggunakan '#' sebagai fallback.`);
      }
    } catch (e) {
      console.error(`Error saat memproses rute "${href}":`, e);
    }
  }

  const activeClasses = isActive ? 'bg-black/20' : 'hover:bg-black/10';

  return (
    <Link
      href={url} // Gunakan URL yang sudah diproses (aman)
      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeClasses}`}
    >
      <Icon className="w-5 h-5 mr-3" />
      {children}
    </Link>
  );
}
// --- BATAS PERBAIKAN ---

export default function AppLayout({ header, children }: LayoutProps) {
  const { auth, flash } = usePage<PageProps>().props;
  const [showModal, setShowModal] = useState(false);

  // Perbaikan untuk 'flash is undefined'
  useEffect(() => {
    if (flash?.login_success) { // Gunakan optional chaining
      setShowModal(true);
    }
  }, [flash]);

  return (
    <div className="flex h-screen bg-theme-background">

      {/* --- POP-UP LOGIN BERHASIL (MODAL) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm text-center">
            <CheckCircle2 size={50} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Berhasil!</h2>
            <p className="text-gray-600 mb-6">{flash.login_success}</p>
            <button
              onClick={() => setShowModal(false)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* --- SIDEBAR (KIRI) --- */}
      <aside className="w-64 bg-theme-sidebar text-white/90 p-5 flex flex-col">
        {/* Info Warung & User */}
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3">
            <span className="text-xl font-bold text-theme-sidebar">
              {auth.user.name.charAt(0)}
            </span>
          </div>
          <div>
            <div className="font-bold text-lg text-white">Warung Cangkruk</div>
            <div className="text-xs text-white/70">
              {auth.user.name} (Supervisor 1)
            </div>
          </div>
        </div>

        {/* --- Link Sidebar (Sudah diperbaiki) --- */}
        <nav className="flex-1 space-y-2">
          <SidebarLink href="dashboard" icon={LayoutDashboard}>
            Dashboard
          </SidebarLink>
          <SidebarLink href="#" icon={Users}>
            Manajemen Akun
          </SidebarLink>
          <SidebarLink href="#" icon={Box}>
            Master Data
          </SidebarLink>
          <SidebarLink href="#" icon={ClipboardList}>
            Stok Harian
          </SidebarLink>
          <SidebarLink href="#" icon={ClipboardCheck}>
            Stok Opname
          </SidebarLink>
          <SidebarLink href="#" icon={FileText}>
            Laporan Aktivitas
          </SidebarLink>
        </nav>

        {/* Tombol Keluar (Bawah) */}
        <div>
          <Link
            href={route('logout')}
            method="post"
            as="button"
            className="flex items-center px-4 py-3 w-full text-sm font-medium rounded-lg hover:bg-black/10 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Keluar
          </Link>
        </div>
      </aside>

      {/* --- KONTEN UTAMA (KANAN) --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Konten (Logo, Judul, Notifikasi) */}
        <header className="bg-white shadow-sm p-6">
          <div className="flex justify-between items-center">
            {/* Logo + Judul */}
            <div className="flex items-center">
              <img src="/images/stockhub-logo.png" alt="StockHub Logo" className="h-10" />
              {/* Ini adalah "slot" untuk judul */}
              {header && (
                <div className="ml-6 text-2xl font-semibold text-gray-800">
                  {header}
                </div>
              )}
            </div>

            {    }
            <div className="flex items-center">
              <div className="text-right mr-6">
                <div className="font-semibold text-gray-800">{auth.user.name}</div>
                <div className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="relative p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                <Bell className="w-6 h-6 text-gray-600" />
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  3
                </span>
              </div>
            </div>
          </div>
        </header>

        {    }
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
