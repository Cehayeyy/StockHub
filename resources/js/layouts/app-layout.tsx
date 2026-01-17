import React, { useState, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
  LayoutDashboard,
  Users,
  Box,
  ClipboardList,
  ClipboardCheck,
  FileText,
  LogOut,
  CheckCircle2,
  ChevronDown,
  Tag,
  Package,
  BookOpen,
  CupSoda,
  CookingPot,
  Menu,
  X,
} from 'lucide-react';

// Tipe data props halaman
interface PageProps {
  auth: {
    user: {
      name: string;
      email: string;
      role?: string;
      division?: 'bar' | 'dapur';
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
  onNavigate,
}: {
  href?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onClick?: () => void;
  onNavigate?: () => void;
}) {
  let isActive = false;
  let url = '#';

  try {
    // Cek apakah href adalah nama route yang valid
    if (href && route().has(href)) {
      isActive = route().current(href);
      url = route(href);
    }
    // Jika bukan route name, anggap URL biasa (fallback)
    else if (href) {
        url = href;
    }
  } catch (e) {
    console.warn(`Route ${href} tidak ditemukan atau error.`);
  }

  const activeClasses = isActive ? 'bg-black/20' : 'hover:bg-black/10';

  return (
    <Link
      href={url}
      onClick={(e) => {
        onClick?.();
        onNavigate?.();
      }}
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
  onNavigate,
}: {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onNavigate?: () => void;
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
      onClick={onNavigate}
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

  const rawRole = auth?.user?.role;
  const role = auth?.user?.role?.toLowerCase();
  const divisionRaw =
    auth?.user?.division?.toLowerCase() ??
    auth?.user?.role?.toLowerCase();

  const division =
    divisionRaw === 'kitchen' ? 'dapur' : divisionRaw;

  const isStaff = role !== 'owner' && role !== 'supervisor';

  // AUTO LOGOUT IDLE 10 MENIT + LOGOUT SAAT BROWSER DITUTUP ATAU DEVICE MATI
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        router.post(route("logout"));
      }, 10 * 60 * 1000); // 10 menit
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);

    window.addEventListener("beforeunload", () => {
      navigator.sendBeacon(route("logout"));
    });

    resetTimer();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
    };
  }, []);


  const [showModal, setShowModal] = useState(false);

  // Mobile sidebar state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Close mobile menu when navigating
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Sidebar Content Component (reusable untuk desktop dan mobile)
  const SidebarContent = () => (
    <>
      {/* Profil User + Nama Warung */}
      <div className="flex items-center mb-8 flex-shrink-0">
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
        <SidebarLink href="dashboard" icon={LayoutDashboard} onNavigate={closeMobileMenu}>
          Dasbor
        </SidebarLink>

        {!isStaff && (
          <SidebarLink href="manajemen" icon={Users} onNavigate={closeMobileMenu}>
            Manajemen Akun
          </SidebarLink>
        )}

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
              <SubMenuLink href="kategori" icon={Tag} onNavigate={closeMobileMenu}>
                Kategori
              </SubMenuLink>
              <SubMenuLink href="item.index" icon={Package} onNavigate={closeMobileMenu}>
                Item
              </SubMenuLink>
              <SubMenuLink href="resep" icon={BookOpen} onNavigate={closeMobileMenu}>
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
              {/* OWNER / SUPERVISOR */}
              {!isStaff && (
                <>
                  <SubMenuLink href="stok-harian.bar" icon={CupSoda} onNavigate={closeMobileMenu}>
                    Bar
                  </SubMenuLink>
                  <SubMenuLink href="stok-harian.dapur" icon={CookingPot} onNavigate={closeMobileMenu}>
                    Dapur
                  </SubMenuLink>
                </>
              )}

              {/* STAFF BAR */}
              {isStaff && division === "bar" && (
                <SubMenuLink href="stok-harian.bar" icon={CupSoda} onNavigate={closeMobileMenu}>
                  Bar
                </SubMenuLink>
              )}

              {/* STAFF DAPUR */}
              {isStaff && division === "dapur" && (
                <SubMenuLink href="stok-harian.dapur" icon={CookingPot} onNavigate={closeMobileMenu}>
                  Dapur
                </SubMenuLink>
              )}
            </div>
          )}
        </div>

        <SidebarLink href="verifikasi-stok.index" icon={ClipboardCheck} onNavigate={closeMobileMenu}>
          Verifikasi Stok
        </SidebarLink>

        {/* Laporan Aktivitas */}
        {!isStaff && (
          <SidebarLink href="laporan-aktivitas" icon={FileText} onNavigate={closeMobileMenu}>
            Laporan Aktifitas
          </SidebarLink>
        )}
      </nav>

      {/* TOMBOL KELUAR */}
      <div className="mt-auto pt-4 flex-shrink-0">
        <Link
          href={route('logout')}
          method="post"
          as="button"
          onClick={closeMobileMenu}
          className="flex items-center px-4 py-3 w-full text-sm font-medium rounded-lg hover:bg-black/10 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3 text-white/90" />
          Keluar
        </Link>
      </div>
    </>
  );

  return (
    // FIX SCROLL: overflow-hidden di root untuk mencegah scroll body ganda
    <div className="flex h-screen w-full bg-theme-background overflow-hidden">

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#502A07] text-white/90 p-5 flex flex-col transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          <X size={20} className="text-white" />
        </button>

        <SidebarContent />
      </aside>

      {/* Modal Login Berhasil */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-sm w-full text-center">
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

      {/* Desktop Sidebar */}
      {/* FIX SCROLL: flex-shrink-0 (agar lebar tetap), overflow-y-auto (agar menu bisa discroll sendiri) */}
      <aside className="w-64 bg-[#502A07] text-white/90 p-5 flex-col flex-shrink-0 h-full overflow-y-auto hidden md:flex">
        <SidebarContent />
      </aside>

      {/* AREA KANAN */}
      {/* FIX SCROLL: min-w-0 agar konten tidak melebar paksa keluar layar */}
      <div className="flex-1 flex flex-col h-screen min-w-0 bg-gray-50 relative">

        {/* Header */}
        <header className="bg-white shadow-sm p-3 sm:p-4 md:p-6 flex-shrink-0 z-10 w-full">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Hamburger Menu Button (Mobile Only) */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#502A07] text-white md:hidden"
              >
                <Menu size={22} />
              </button>

              <img
                src="/images/stockhub-logo.png"
                alt="StockHub Logo"
                className="h-8 sm:h-10"
              />
              {header && (
                <div className="ml-2 sm:ml-4 md:ml-6 text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 hidden sm:block">
                  {header}
                </div>
              )}
            </div>

            <div className="flex items-center">
              <div className="text-right">
                <div className="font-semibold text-gray-800 text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">
                  {auth.user.name}
                  <span className="hidden sm:inline">
                    {auth.user.role ? ` (${auth.user.role})` : ''}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-gray-500 hidden sm:block">{formattedDate}</div>
                <div className="text-xs sm:text-sm font-mono font-semibold text-[#5D4037]">
                  {formattedTime}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* KONTEN HALAMAN */}
        {/* FIX SCROLL: overflow-y-auto di sini agar hanya area ini yang discroll */}
        {/* overflow-y-visible diganti jadi overflow-y-auto + min-h-0 */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto w-full min-h-0">
            {children}
        </main>
      </div>
    </div>
  );
}
