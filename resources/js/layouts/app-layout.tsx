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
<<<<<<< HEAD
  ChevronDown
=======
  ChevronRight,
>>>>>>> b2ff960a95917d8dae342da6956ea8387cd97c1f
} from 'lucide-react';

// Tipe data props halaman
interface PageProps {
  auth: {
    user: {
      name: string;
      email: string;
    };
  };
  flash?: {
    login_success?: string;
  };
  [key: string]: any; // supaya kompatibel dengan Inertia PageProps
}

<<<<<<< HEAD
// Tipe props layout
interface LayoutProps {
  header?: React.ReactNode;
  children: React.ReactNode;
}

=======
// Komponen sidebar link utama
>>>>>>> b2ff960a95917d8dae342da6956ea8387cd97c1f
function SidebarLink({
  href,
  icon: Icon,
  children,
<<<<<<< HEAD
  onClick,
}: {
  href?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onClick?: () => void;
=======
}: {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
>>>>>>> b2ff960a95917d8dae342da6956ea8387cd97c1f
}) {
  let isActive = false;
  let url = "#";

  try {
    if (href && route().has(href)) {
      isActive = route().current(href);
      url = route(href);
    }
  } catch (e) {
    console.warn(`Route ${href} tidak ditemukan.`);
  }

  const activeClasses = "hover:bg-black/10";

  return (
    <Link
      href={href ? url : ""}
      onClick={onClick}
      preserveScroll
      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeClasses}`}
    >
      <Icon className="w-5 h-5 mr-3" />
      {children}
    </Link>
  );
}

<<<<<<< HEAD
export default function AppLayout({ header, children }: LayoutProps) {
  const { auth, flash } = usePage<PageProps>().props;
=======
// Komponen sidebar submenu (tanpa icon, agak menjorok ke kanan)
function SidebarSubLink({
  href,
  children,
}: {
  href: string;
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
    console.warn(`Route ${href} (submenu) tidak ditemukan.`);
  }

  const base =
    'block ml-8 mt-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors';
  const activeClasses = isActive
    ? 'bg-black/30 text-white'
    : 'bg-black/10 text-white/90 hover:bg-black/20';

  return (
    <Link href={url} className={`${base} ${activeClasses}`}>
      {children}
    </Link>
  );
}

export default function AppLayout({
  header,
  children,
}: PropsWithChildren<{ header?: React.ReactNode }>) {
  const page = usePage<PageProps>();
  const { auth, flash } = page.props;
  const currentUrl = page.url as string;

  const isDataIndukActive = currentUrl.startsWith('/masterdata');
  const isStokHarianActive = currentUrl.startsWith('/stok-harian');

>>>>>>> b2ff960a95917d8dae342da6956ea8387cd97c1f
  const [showModal, setShowModal] = useState(false);
  const [openMasterData, setOpenMasterData] = useState(false);

  // collapse/expand
  const [masterDataOpen, setMasterDataOpen] = useState(isDataIndukActive);
  const [stokHarianOpen, setStokHarianOpen] = useState(isStokHarianActive);

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
<<<<<<< HEAD

      {/* Modal Login Berhasil */}
=======
      {/* MODAL LOGIN */}
>>>>>>> b2ff960a95917d8dae342da6956ea8387cd97c1f
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
            </div>
          </div>
        </div>

        {/* MENU NAVIGASI */}
        <nav className="flex-1 space-y-2">
<<<<<<< HEAD
          <SidebarLink href="dashboard" icon={LayoutDashboard}>Dashboard</SidebarLink>
          <SidebarLink href="manajemen" icon={Users}>Manajemen Akun</SidebarLink>

          {/* MASTER DATA */}
          <div>
            <button
              onClick={() => setOpenMasterData(!openMasterData)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-lg hover:bg-black/10 transition-colors"
            >
              <div className="flex items-center">
                <Box className="w-5 h-5 mr-3" />
                Master Data
              </div>

              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${openMasterData ? "rotate-180" : ""}`}
              />
            </button>

           {openMasterData && (
            <div className="ml-10 mt-2 space-y-3 text-sm">

                <div className="bg-[#795548] hover:bg-[#6D4C41] text-white px-4 py-3 rounded-lg shadow-md transition">
                <Link href={route("kategori")} className="block">
                    Kategori
                </Link>
                </div>

                <div className="bg-[#795548] hover:bg-[#6D4C41] text-white px-4 py-3 rounded-lg shadow-md transition">
                <Link href={route("item")} className="block">
                    Item
                </Link>
                </div>

                <div className="bg-[#795548] hover:bg-[#6D4C41] text-white px-4 py-3 rounded-lg shadow-md transition">
                <Link href={route("resep")} className="block">
                    Resep
                </Link>
                </div>

            </div>
)}

          </div>

          <SidebarLink href="#" icon={ClipboardList}>Stok Harian</SidebarLink>
          <SidebarLink href="#" icon={ClipboardCheck}>Stok Opname</SidebarLink>
          <SidebarLink href="#" icon={FileText}>Laporan Aktivitas</SidebarLink>
=======
          <SidebarLink href="dashboard" icon={LayoutDashboard}>
            Dasbor
          </SidebarLink>

          <SidebarLink href="manajemen" icon={Users}>
            Manajemen Akun
          </SidebarLink>

          {/* DATA INDUK + CHEVRON + SUB KATEGORI/ITEM/RESEP */}
          <div>
            <button
              type="button"
              onClick={() => setMasterDataOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isDataIndukActive ? 'bg-black/20' : 'hover:bg-black/10'
              }`}
            >
              <span className="flex items-center">
                <Box className="w-5 h-5 mr-3" />
                Data Induk
              </span>
              <ChevronRight
                className={`w-4 h-4 transition-transform ${
                  masterDataOpen ? 'rotate-90' : ''
                }`}
              />
            </button>

            {masterDataOpen && (
              <>
                {/* urutan: Kategori, Item, Resep */}
                <SidebarSubLink href="masterdata.kategori">
                  Kategori
                </SidebarSubLink>
                <SidebarSubLink href="masterdata.item">
                  Item
                </SidebarSubLink>
                <SidebarSubLink href="masterdata.resep">
                  Resep
                </SidebarSubLink>
              </>
            )}
          </div>

          {/* STOK HARIAN + CHEVRON + SUB BAR/DAPUR */}
          <div>
            <button
              type="button"
              onClick={() => setStokHarianOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isStokHarianActive ? 'bg-black/20' : 'hover:bg-black/10'
              }`}
            >
              <span className="flex items-center">
                <ClipboardList className="w-5 h-5 mr-3" />
                Stok Harian
              </span>
              <ChevronRight
                className={`w-4 h-4 transition-transform ${
                  stokHarianOpen ? 'rotate-90' : ''
                }`}
              />
            </button>

            {stokHarianOpen && (
              <>
                <SidebarSubLink href="stok-harian.bar">Bar</SidebarSubLink>
                <SidebarSubLink href="stok-harian.dapur">
                  Dapur
                </SidebarSubLink>
              </>
            )}
          </div>

          <SidebarLink href="#" icon={ClipboardCheck}>
            Verifikasi Stok
          </SidebarLink>

          <SidebarLink href="#" icon={FileText}>
            Laporan Aktivitas
          </SidebarLink>
>>>>>>> b2ff960a95917d8dae342da6956ea8387cd97c1f
        </nav>

        {/* TOMBOL KELUAR */}
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

      {/* AREA KANAN */}
      <div className="flex-1 flex flex-col overflow-hidden">
<<<<<<< HEAD
        <header className="bg-white shadow-sm p-6">
          <div className="flex justify-between items-center">
=======
        {/* HEADER */}
        <header className="bg-white shadow-sm p-6">
          <div className="flex justify-between items-center">
            {/* Judul */}
>>>>>>> b2ff960a95917d8dae342da6956ea8387cd97c1f
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

<<<<<<< HEAD
=======
            {/* USER + TANGGAL + JAM + NOTIF */}
>>>>>>> b2ff960a95917d8dae342da6956ea8387cd97c1f
            <div className="flex items-center">
              <div className="text-right mr-6">
                <div className="font-semibold text-gray-800">{auth.user.name}</div>
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
