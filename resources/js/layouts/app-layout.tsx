import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
  LayoutDashboard,
  Users,
  Box,
  ClipboardList,
  ClipboardCheck,
  FileText,
  LogOut,
  Bell,
  CheckCircle2,
  ChevronDown,
  Tag,        // Kategori
  Package,    // Item
  BookOpen,   // Resep
  CupSoda,    // Bar
  CookingPot, // Dapur
} from 'lucide-react';

// Tipe data props halaman
interface PageProps {
  auth: {
    user: {
      name: string;
      email: string;
      role?: string;
    };
  };
  flash?: {
    login_success?: string;
  };
  [key: string]: any; // supaya kompatibel dengan Inertia PageProps
}

// Tipe props layout
interface LayoutProps {
  header?: React.ReactNode;
  children: React.ReactNode;
}

// Komponen sidebar link utama (menu besar)
function SidebarLink({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  let isActive = false;
  let url = '#';

  try {
    if (href && route().has(href)) {
      isActive = route().current(href);
      url = route(href);
    }
  } catch (e) {
    console.warn(`Route ${href} tidak ditemukan.`);
  }

  const activeClasses = isActive ? 'bg-black/20' : 'hover:bg-black/10';

  return (
    <Link
      href={href ? url : ''}
      onClick={onClick}
      preserveScroll
      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeClasses}`}
    >
      <Icon className="w-5 h-5 mr-3 text-white/90" />
      {children}
    </Link>
  );
}

// Link untuk submenu (Kategori, Item, Resep, Bar, Dapur)
function SubMenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  let isActive = false;
  let url = '#';

  try {
    if (route().has(href)) {
      isActive = route().current(href);
      url = route(href);
    }
  } catch (e) {
    console.warn(`Route submenu ${href} tidak ditemukan.`);
  }

  const activeClasses = isActive
    ? 'bg-black/20 text-white'
    : 'text-white/90 hover:bg-black/10';

  return (
    <Link
      href={url}
      preserveScroll
      className={`flex items-center ml-8 px-4 py-2 text-sm rounded-lg transition-colors ${activeClasses}`}
    >
      <Icon className="w-4 h-4 mr-3 text-white/90" />
      <span>{children}</span>
    </Link>
  );
}

export default function AppLayout({ header, children }: LayoutProps) {
  const { auth, flash } = usePage<PageProps>().props;

  const [showModal, setShowModal] = useState(false);

  // buka/tutup submenu
  const [openMasterData, setOpenMasterData] = useState(false);
  const [openStokHarian, setOpenStokHarian] = useState(false);

  // Jam realtime
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (flash?.login_success) {
      setShowModal(true);
    }
  }, [flash]);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime =
    currentTime
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      .replace(/\./g, ':') + ' WIB';

  return (
    <div className="flex h-screen bg-theme-background">
      {/* Modal Login Berhasil */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm text-center">
            <CheckCircle2 size={50} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Berhasil!</h2>
            <p className="text-gray-600 mb-6">{flash?.login_success}</p>
            <button
              onClick={() => setShowModal(false)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-theme-sidebar text-white/90 p-5 flex flex-col">
        {/* Profil User + Nama Warung */}
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3">
            <span className="text-xl font-bold text-theme-sidebar">
              {auth.user.name.charAt(0)}
            </span>
          </div>
          <div>
            <div className="font-bold text-lg text-white">Warung Cangkruk</div>
            <div className="text-xs text-white/70">
              {auth.user.name}
              {auth.user.role ? ` (${auth.user.role})` : ''}
            </div>
          </div>
        </div>

        {/* MENU NAVIGASI */}
        <nav className="flex-1 space-y-2">
          <SidebarLink href="dashboard" icon={LayoutDashboard}>
            Dasbor
          </SidebarLink>

          <SidebarLink href="manajemen" icon={Users}>
            Manajemen Akun
          </SidebarLink>

          {/* DATA INDUK + SUB: Kategori, Item, Resep */}
          <div>
            <button
              type="button"
              onClick={() => setOpenMasterData(!openMasterData)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-lg hover:bg-black/10 transition-colors"
            >
              <div className="flex items-center">
                <Box className="w-5 h-5 mr-3 text-white/90" />
                Data Induk
              </div>

              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  openMasterData ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openMasterData && (
              <div className="mt-1 space-y-1">
                <SubMenuLink href="kategori" icon={Tag}>
                  Kategori
                </SubMenuLink>
                <SubMenuLink href="item" icon={Package}>
                  Item
                </SubMenuLink>
                <SubMenuLink href="resep" icon={BookOpen}>
                  Resep
                </SubMenuLink>
              </div>
            )}
          </div>

          {/* STOK HARIAN + SUB: Bar, Dapur */}
          <div>
            <button
              type="button"
              onClick={() => setOpenStokHarian(!openStokHarian)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-lg hover:bg-black/10 transition-colors"
            >
              <div className="flex items-center">
                <ClipboardList className="w-5 h-5 mr-3 text-white/90" />
                Stok Harian
              </div>

              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  openStokHarian ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openStokHarian && (
              <div className="mt-1 space-y-1">
                <SubMenuLink href="stok-harian.bar" icon={CupSoda}>
                  Bar
                </SubMenuLink>
                <SubMenuLink href="stok-harian.dapur" icon={CookingPot}>
                  Dapur
                </SubMenuLink>
              </div>
            )}
          </div>

          <SidebarLink href="#" icon={ClipboardCheck}>
            Verifikasi Stok
          </SidebarLink>

          {/* Laporan Aktivitas mengarah ke route "laporan-aktivitas" */}
          <SidebarLink href="laporan-aktivitas" icon={FileText}>
            Laporan Aktifitas
          </SidebarLink>
        </nav>

        {/* TOMBOL KELUAR */}
        <div>
          <Link
            href={route('logout')}
            method="post"
            as="button"
            className="flex items-center px-4 py-3 w-full text-sm font-medium rounded-lg hover:bg-black/10 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3 text-white/90" />
            Keluar
          </Link>
        </div>
      </aside>

      {/* AREA KANAN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <img
                src="/images/stockhub-logo.png"
                alt="StockHub Logo"
                className="h-10"
              />
              {header && (
                <div className="ml-6 text-2xl font-semibold text-gray-800">
                  {header}
                </div>
              )}
            </div>

            <div className="flex items-center">
              <div className="text-right mr-6">
                <div className="font-semibold text-gray-800">
                  {auth.user.name}
                  {auth.user.role ? ` (${auth.user.role})` : ''}
                </div>
                <div className="text-sm text-gray-500">{formattedDate}</div>
                <div className="text-sm font-mono font-semibold text-[#5D4037]">
                  {formattedTime}
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

        {/* KONTEN HALAMAN */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
