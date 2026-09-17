import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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

  return (
    <Sidebar collapsible="icon" variant="inset">
      {/* HEADER LOGO */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" preserveScroll prefetch>
                <AppLogo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* MENU UTAMA */}
      <SidebarContent className="overflow-y-auto">
        <SidebarGroup className="px-2 py-0">
          <SidebarGroupLabel>Menu</SidebarGroupLabel>

          <SidebarMenu>
            {/* Dasbor */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/dashboard')}
              >
                <Link href="/dashboard" preserveScroll prefetch>
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
                <Link href="/manajemen-akun" preserveScroll prefetch>
                  <Users />
                  <span>Manajemen Akun</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* DATA INDUK + SUB: Kategori, Item, Resep */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isStartsWith('/masterdata') || isStartsWith('/kategori') || isStartsWith('/item') || isStartsWith('/resep')}
              >
                <Link href="/masterdata" preserveScroll prefetch>
                  <Box />
                  <span>Data Induk</span>
                </Link>
              </SidebarMenuButton>

              {/* SUB-MENU DATA INDUK MENGGUNAKAN SHADCN SUB-COMPONENTS */}
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isStartsWith('/kategori') || isStartsWith('/masterdata/kategori')}
                  >
                    <Link href="/kategori" preserveScroll prefetch>
                      Kategori
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>

                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isStartsWith('/item') || isStartsWith('/masterdata/item')}
                  >
                    <Link href="/item" preserveScroll prefetch>
                      Item
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>

                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isStartsWith('/resep') || isStartsWith('/masterdata/resep')}
                  >
                    <Link href="/resep" preserveScroll prefetch>
                      Resep
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>

            {/* STOK HARIAN + SUB: Bar, Dapur */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  isStartsWith('/stok-harian/bar') ||
                  isStartsWith('/stok-harian/dapur') ||
                  isStartsWith('/stok-harian-dapur')
                }
              >
                <Link href="/stok-harian/bar" preserveScroll prefetch>
                  <ClipboardList />
                  <span>Stok Harian</span>
                </Link>
              </SidebarMenuButton>

              {/* SUB-MENU STOK HARIAN */}
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isStartsWith('/stok-harian/bar')}
                  >
                    <Link href="/stok-harian/bar" preserveScroll prefetch>
                      Bar
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>

                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isStartsWith('/stok-harian-dapur') || isStartsWith('/stok-harian/dapur')}
                  >
                    <Link href="/stok-harian-dapur" preserveScroll prefetch>
                      Dapur
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>

            {/* Verifikasi Stok */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isStartsWith('/verifikasi-stok')}
              >
                <Link href="/verifikasi-stok" preserveScroll prefetch>
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
                <Link href="/laporan-aktivitas" preserveScroll prefetch>
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
