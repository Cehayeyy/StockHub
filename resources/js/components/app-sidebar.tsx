import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { NavFooter } from '@/components/nav-footer';
import { NavUser } from '@/components/nav-user';
import AppLogo from './app-logo';

import { Link, usePage } from '@inertiajs/react';
import {
  LayoutGrid,
  Users,
  Box,
  ClipboardList,
  CheckSquare,
  FileText,
  Folder,
  BookOpen,
} from 'lucide-react';

const footerNavItems = [
  {
    title: 'Repository',
    url: 'https://github.com/laravel/react-starter-kit',
    icon: Folder,
  },
  {
    title: 'Documentation',
    url: 'https://laravel.com/docs/starter-kits',
    icon: BookOpen,
  },
];

export function AppSidebar() {
  const page = usePage();
  const currentUrl = page.url as string;

  const isActive = (url: string) => currentUrl === url;
  const isStartsWith = (url: string) => currentUrl.startsWith(url);

  const subLinkClass = (active: boolean) =>
    `block w-full rounded-lg px-4 py-2 text-sm font-medium text-left ${
      active
        ? 'bg-[#c58a5a] text-white'
        : 'bg-[#5b3623] text-white/90 hover:bg-[#70402a]'
    }`;

  return (
    <Sidebar collapsible="icon" variant="inset">
      {/* HEADER LOGO */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" prefetch>
                <AppLogo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* MENU UTAMA */}
      <SidebarContent>
        <SidebarGroup className="px-2 py-0">
          <SidebarGroupLabel>Menu</SidebarGroupLabel>

          <SidebarMenu>
            {/* Dasbor */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/dashboard')}
              >
                <Link href="/dashboard" prefetch>
                  <LayoutGrid />
                  <span>Dasbor</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Manajemen Akun */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isStartsWith('/manajemen-akun')}
              >
                <Link href="/manajemen-akun" prefetch>
                  <Users />
                  <span>Manajemen Akun</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* DATA INDUK + SUB: Kategori, Item, Resep */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isStartsWith('/masterdata')}
              >
                <Link href="/masterdata" prefetch>
                  <Box />
                  <span>Data Induk</span>
                </Link>
              </SidebarMenuButton>

              {/* SUB-MENU DATA INDUK */}
              <div className="mt-2 ml-6 space-y-2">
                <Link
                  href="/masterdata/kategori"
                  prefetch
                  className={subLinkClass(
                    isStartsWith('/masterdata/kategori'),
                  )}
                >
                  Kategori
                </Link>
                <Link
                  href="/masterdata/item"
                  prefetch
                  className={subLinkClass(
                    isStartsWith('/masterdata/item'),
                  )}
                >
                  Item
                </Link>
                <Link
                  href="/masterdata/resep"
                  prefetch
                  className={subLinkClass(
                    isStartsWith('/masterdata/resep'),
                  )}
                >
                  Resep
                </Link>
              </div>
            </SidebarMenuItem>

            {/* STOK HARIAN + SUB: Bar, Dapur */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  isStartsWith('/stok-harian/bar') ||
                  isStartsWith('/stok-harian/dapur')
                }
              >
                <Link href="/stok-harian/bar" prefetch>
                  <ClipboardList />
                  <span>Stok Harian</span>
                </Link>
              </SidebarMenuButton>

              {/* SUB-MENU STOK HARIAN */}
              <div className="mt-2 ml-6 space-y-2">
                <Link
                  href="/stok-harian/bar"
                  prefetch
                  className={subLinkClass(
                    isStartsWith('/stok-harian/bar'),
                  )}
                >
                  Bar
                </Link>
                <Link
                  href="/stok-harian/dapur"
                  prefetch
                  className={subLinkClass(
                    isStartsWith('/stok-harian/dapur'),
                  )}
                >
                  Dapur
                </Link>
              </div>
            </SidebarMenuItem>

            {/* Verifikasi Stok */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isStartsWith('/verifikasi-stok')}
              >
                <Link href="/verifikasi-stok" prefetch>
                  <CheckSquare />
                  <span>Verifikasi Stok</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Laporan Aktivitas */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isStartsWith('/laporan-aktivitas')}
              >
                <Link href="/laporan-aktivitas" prefetch>
                  <FileText />
                  <span>Laporan Aktivitas</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter>
        <NavFooter items={footerNavItems} className="mt-auto" />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
