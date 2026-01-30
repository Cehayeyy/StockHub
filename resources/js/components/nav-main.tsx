import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const currentUrl = page.url as string;

    const isActive = (url: string) => currentUrl === url;
    const isSubActive = (url: string) => currentUrl.startsWith(url);

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Menu</SidebarGroupLabel>

            <SidebarMenu>
                {items.map((item) => {
                    // MENU TANPA SUB (Dasbor, Manajemen Akun, Verifikasi, Laporan, dll)
                    if (!item.items || item.items.length === 0) {
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActive(item.url)}
                                >
                                    <Link href={item.url} prefetch>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    }

                    // MENU DENGAN SUB (Data Induk, Stok Harian)
                    return (
                        <SidebarMenuItem key={item.title}>
                            {/* tombol induk */}
                            <SidebarMenuButton
                                asChild
                                isActive={
                                    isActive(item.url) ||
                                    item.items.some((sub) =>
                                        isSubActive(sub.url),
                                    )
                                }
                            >
                                <Link href={item.url} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>

                            {/* daftar submenu */}
                            <SidebarMenuSub>
                                {item.items.map((subItem) => (
                                    <SidebarMenuSubItem
                                        key={subItem.title}
                                    >
                                        <SidebarMenuSubButton
                                            asChild
                                            isActive={isSubActive(
                                                subItem.url,
                                            )}
                                            size="md"
                                        >
                                            <Link
                                                href={subItem.url}
                                                prefetch
                                            >
                                                <span>{subItem.title}</span>
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
