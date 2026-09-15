import React, { useState, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from "framer-motion";
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
  AlertTriangle,
  PackageOpen,
  FileWarning,
  Receipt,
  TrendingUp,
  Layers,
  Calendar,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface PageProps {
  auth: {
    user: {
      name: string;
      username?: string;
      email: string;
      role?: string;
      division?: 'bar' | 'dapur';
    };
  };
  flash?: {
    login_success?: string;
  };
  [key: string]: any;
}

interface LayoutProps {
  header?: React.ReactNode;
  children: React.ReactNode;
}

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
    if (href && route().has(href)) {
      isActive = route().current(href);
      url = route(href);
    } else if (href) {
        url = href;
    }
  } catch (e) {
    console.warn(`Route ${href} tidak ditemukan atau error.`);
  }

  const activeClasses = isActive 
    ? 'bg-black/30 text-white font-bold shadow-sm' 
    : 'text-white/90 hover:bg-black/15 hover:text-white font-semibold';

  return (
    <Link
      href={url}
      onClick={(e) => {
        onClick?.();
        onNavigate?.();
      }}
      preserveScroll
      className={`flex items-center px-4 py-3 text-sm rounded-2xl transition-all duration-200 ${activeClasses}`}
    >
      <Icon className="w-5 h-5 mr-3 text-white/95 flex-shrink-0" />
      <span className="whitespace-nowrap">{children}</span>
    </Link>
  );
}

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
    ? 'bg-black/30 text-white font-bold'
    : 'text-white/80 hover:bg-black/15 hover:text-white font-medium';

  return (
    <Link
      href={url}
      onClick={onNavigate}
      preserveScroll
      className={`flex items-center px-3 py-2 text-xs rounded-xl transition-all duration-200 ${activeClasses}`}
    >
      <Icon className="w-4 h-4 mr-2.5 text-white/90 flex-shrink-0" />
      <span className="whitespace-nowrap">{children}</span>
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

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        router.post(route("logout"));
      }, 10 * 60 * 1000);
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [openMasterData, setOpenMasterData] = useState(false);
  const [openStokHarian, setOpenStokHarian] = useState(false);
  const [openAuditData, setOpenAuditData] = useState(false);
  const [openVerifikasi, setOpenVerifikasi] = useState(false);
  const [openLaporan, setOpenLaporan] = useState(false);

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

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // 🌟 KARTU SIDEBAR MENGAPUNG BERWARNA COKLAT KHAS STOCKHUB
  const SidebarContent = () => (
    <div className="w-[280px] p-4 sm:p-5 flex flex-col h-[calc(100vh-2rem)] bg-[#6F4E37] text-white/90 rounded-3xl shadow-2xl border border-white/10 my-4 ml-4">
      
      {/* HEADER PROFIL DENGAN TOMBOL TUTUP DI DALAMNYA */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0 bg-black/20 p-3 rounded-2xl border border-white/10">
        <div className="flex items-center overflow-hidden">
          <div className="w-11 h-11 rounded-xl bg-white/10 text-white font-bold flex items-center justify-center mr-3 flex-shrink-0 shadow-inner">
            <span>
              {(auth?.user?.name || auth?.user?.username || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="truncate">
            <div className="font-extrabold text-sm text-white truncate">Warung Cangkruk</div>
            <div className="text-xs text-white/70 truncate capitalize">
              {auth.user.name || auth.user.username} ({auth.user.role})
            </div>
          </div>
        </div>

        {/* 🔥 TOMBOL TUTUP SIDEBAR DI DALAM CARD PROFIL */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 transition text-white flex items-center justify-center flex-shrink-0 ml-2"
          title="Tutup Sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* NAVIGASI MENU */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden pr-1">
        <SidebarLink href="dashboard" icon={LayoutDashboard} onNavigate={closeMobileMenu}>
          Dasbor
        </SidebarLink>

        {!isStaff && (
          <SidebarLink href="manajemen" icon={Users} onNavigate={closeMobileMenu}>
            Manajemen Akun
          </SidebarLink>
        )}

        {/* Data Induk */}
        <div>
          <button
            type="button"
            onClick={() => setOpenMasterData(!openMasterData)}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-bold text-white/90 rounded-2xl hover:bg-black/15 transition-colors"
          >
            <div className="flex items-center">
              <Box className="w-5 h-5 mr-3 text-white/95 flex-shrink-0" />
              <span className="whitespace-nowrap">Data Induk</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-200 ${openMasterData ? 'rotate-180' : ''}`} />
          </button>

          {openMasterData && (
            <div className="mt-1 space-y-1 pl-4">
              <SubMenuLink href="kategori" icon={Tag} onNavigate={closeMobileMenu}>Kategori</SubMenuLink>
              <SubMenuLink href="item.index" icon={Package} onNavigate={closeMobileMenu}>Item</SubMenuLink>
              <SubMenuLink href="resep" icon={BookOpen} onNavigate={closeMobileMenu}>Resep</SubMenuLink>
            </div>
          )}
        </div>

        {/* Audit Data */}
        {!isStaff ? (
          <div>
            <button
              type="button"
              onClick={() => setOpenAuditData(!openAuditData)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-bold text-white/90 rounded-2xl hover:bg-black/15 transition-colors"
            >
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-3 text-red-300 flex-shrink-0" />
                <span className="whitespace-nowrap">Audit Data</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-200 ${openAuditData ? 'rotate-180' : ''}`} />
            </button>
            {openAuditData && (
              <div className="mt-1 space-y-1 pl-4">
                <SubMenuLink href="audit.index" icon={FileText} onNavigate={closeMobileMenu}>Laporan Audit</SubMenuLink>
              </div>
            )}
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setOpenAuditData(!openAuditData)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-bold text-white/90 rounded-2xl hover:bg-black/15 transition-colors"
            >
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-3 text-red-300 flex-shrink-0" />
                <span className="whitespace-nowrap">Audit Data</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-200 ${openAuditData ? 'rotate-180' : ''}`} />
            </button>
            {openAuditData && (
              <div className="mt-1 space-y-1 pl-4">
                <SubMenuLink href="laporan-kerugian.index" icon={FileWarning} onNavigate={closeMobileMenu}>Laporan Kerugian</SubMenuLink>
              </div>
            )}
          </div>
        )}

        {/* Stok Harian */}
        <div>
          <button
            type="button"
            onClick={() => setOpenStokHarian(!openStokHarian)}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-bold text-white/90 rounded-2xl hover:bg-black/15 transition-colors"
          >
            <div className="flex items-center">
              <ClipboardList className="w-5 h-5 mr-3 text-white/90 flex-shrink-0" />
              <span className="whitespace-nowrap">Stok Harian</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-200 ${openStokHarian ? 'rotate-180' : ''}`} />
          </button>

          {openStokHarian && (
            <div className="mt-1 space-y-1 pl-4">
              {!isStaff && (
                <>
                  <SubMenuLink href="stok-harian.bar" icon={CupSoda} onNavigate={closeMobileMenu}>Bar</SubMenuLink>
                  <SubMenuLink href="stok-harian.dapur" icon={CookingPot} onNavigate={closeMobileMenu}>Dapur</SubMenuLink>
                </>
              )}
              {isStaff && division === "bar" && (
                <SubMenuLink href="stok-harian.bar" icon={CupSoda} onNavigate={closeMobileMenu}>Bar</SubMenuLink>
              )}
              {isStaff && division === "dapur" && (
                <SubMenuLink href="stok-harian.dapur" icon={CookingPot} onNavigate={closeMobileMenu}>Dapur</SubMenuLink>
              )}
            </div>
          )}
        </div>

        {/* Sales Report */}
        {isStaff && (
          <SidebarLink href="sales-report.index" icon={Receipt} onNavigate={closeMobileMenu}>
            Sales Report
          </SidebarLink>
        )}

        {/* Verifikasi */}
        {!isStaff && (
          <div>
            <button
              type="button"
              onClick={() => setOpenVerifikasi(!openVerifikasi)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-bold text-white/90 rounded-2xl hover:bg-black/15 transition-colors"
            >
              <div className="flex items-center">
                <ClipboardCheck className="w-5 h-5 mr-3 text-white/90 flex-shrink-0" />
                <span className="whitespace-nowrap">Verifikasi</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-200 ${openVerifikasi ? 'rotate-180' : ''}`} />
            </button>

            {openVerifikasi && (
              <div className="mt-1 space-y-1 pl-4">
                <SubMenuLink href="verifikasi-stok.index" icon={PackageOpen} onNavigate={closeMobileMenu}>Verifikasi Stok</SubMenuLink>
                <SubMenuLink href="verifikasi-kerugian.index" icon={FileWarning} onNavigate={closeMobileMenu}>Verifikasi Kerugian</SubMenuLink>
              </div>
            )}
          </div>
        )}

        {/* Laporan */}
        <div>
          <button
            type="button"
            onClick={() => setOpenLaporan(!openLaporan)}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-bold text-white/90 rounded-2xl hover:bg-black/15 transition-colors"
          >
            <div className="flex items-center">
              <FileText className="w-5 h-5 mr-3 text-white/90 flex-shrink-0" />
              <span className="whitespace-nowrap">Laporan</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-200 ${openLaporan ? 'rotate-180' : ''}`} />
          </button>

          {openLaporan && (
            <div className="mt-1 space-y-1 pl-4">
              <SubMenuLink href="laporan-aktivitas" icon={FileText} onNavigate={closeMobileMenu}>
                Laporan Aktivitas
              </SubMenuLink>

              {!isStaff && (
                <>
                  <SubMenuLink href="laporan.analisa-profit" icon={TrendingUp} onNavigate={closeMobileMenu}>
                    Laporan Analisa
                  </SubMenuLink>

                  <SubMenuLink href="laporan.keuangan" icon={Receipt} onNavigate={closeMobileMenu}>
                    Laporan Keuangan
                  </SubMenuLink>

                  <SubMenuLink href="laporan.frekuensi" icon={Layers} onNavigate={closeMobileMenu}>
                    Frekuensi Pembelian
                  </SubMenuLink>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* TOMBOL KELUAR */}
      <div className="mt-auto pt-4 border-t border-white/15 flex-shrink-0">
        <Link
          href={route('logout')}
          method="post"
          as="button"
          onClick={closeMobileMenu}
          className="flex items-center px-4 py-3 w-full text-sm font-bold rounded-2xl text-red-300 hover:bg-red-500/20 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3 text-red-400 flex-shrink-0" />
          <span className="whitespace-nowrap">Keluar</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#FAF7F2] overflow-hidden relative">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[300px] bg-transparent flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-7 right-7 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition z-10 text-white"
        >
          <X size={20} />
        </button>

        <SidebarContent />
      </aside>

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

      <motion.aside
        initial={false}
        animate={{ 
          width: isSidebarOpen ? "300px" : "0px", 
          opacity: isSidebarOpen ? 1 : 0 
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-transparent flex-col flex-shrink-0 h-full hidden lg:flex relative z-20 overflow-hidden whitespace-nowrap"
      >
        <SidebarContent />
      </motion.aside>

      <div className="flex-1 flex flex-col h-screen min-w-0 bg-[#FAF7F2] relative">
        <header className="bg-white/80 backdrop-blur-md shadow-2xs border-b border-amber-100/60 p-3 sm:p-4 md:p-6 flex-shrink-0 z-10 w-full">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              {!isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="hidden lg:flex w-10 h-10 items-center justify-center rounded-xl bg-[#6F4E37] text-white hover:bg-[#402105] transition shadow-md group"
                  title="Buka Sidebar"
                >
                  <PanelLeftOpen size={20} className="group-hover:scale-110 transition-transform" />
                </button>
              )}

              <button
                onClick={() => setMobileMenuOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#6F4E37] text-white lg:hidden"
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
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-amber-100/80 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-[#8B5E3C]/10 text-[#8B5E3C] flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {(auth?.user?.name || auth?.user?.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="text-right flex flex-col">
                  <div className="font-bold text-gray-800 text-xs sm:text-sm truncate max-w-[140px] sm:max-w-none">
                    {auth.user.name || auth.user.username}
                    <span className="text-gray-400 font-medium">
                      {auth.user.username ? ` (@${auth.user.username})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 text-[10px] sm:text-xs text-gray-400 font-medium mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} className="text-[#8B5E3C]" />
                      {formattedDate}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono font-bold text-[#8B5E3C]">
                      <Clock size={10} className="text-[#8B5E3C]" />
                      {formattedTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto w-full min-h-0">
            {children}
        </main>
      </div>
    </div>
  );
}