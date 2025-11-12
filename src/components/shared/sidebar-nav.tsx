'use client';

// Import 'useState' dan 'useEffect' dari React
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  CreditCard,
  Handshake,
  Receipt,
  ShoppingCart,
  Settings,
  Printer,
  Users,
  History,
  CalendarClock,
  ChevronDown,
   // <-- Tambahkan ikon panah
} from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  // Hapus import 'SidebarCollapsible' yang tidak ada
} from '@/components/ui/sidebar';

// Tipe untuk item navigasi, sekarang mendukung children
type NavItem = {
  view: string;
  label: string;
  icon: React.ElementType;
  children?: NavItem[];
};

// Definisikan item navigasi dengan struktur baru
const navItems: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'customers', label: 'Pelanggan', icon: Users },
  { view: 'projects', label: 'Proyek', icon: Briefcase },
  { view: 'daily-report', label: 'Laporan Harian', icon: CalendarClock },
  { 
    view: 'history-group', // ID grup
    label: 'Riwayat', 
    icon: History,
    children: [
      { view: 'history-projects', label: 'Riwayat Proyek', icon: History },
      { view: 'history-expenses', label: 'Pengeluaran', icon: ShoppingCart },
      { view: 'history-income', label: 'Pemasukan', icon: CalendarClock },
    ]
  },
  { 
    view: 'payment-group', // ID grup
    label: 'Pembayaran', 
    icon: CreditCard,
    children: [
      { view: 'payments', label: 'Pembayaran Pelanggan', icon: CreditCard },
      { view: 'partner-payments', label: 'Pembayaran Mitra', icon: Handshake },
      { view: 'partner-receivables', label: 'Piutang Mitra', icon: Receipt },
    ]
  },
];

const settingsItem = { view: 'settings', label: 'Pengaturan', icon: Settings };

interface SidebarNavProps {
    activeView: string;
    setDashboardView: (view: string) => void;
}

export default function SidebarNav({ activeView, setDashboardView }: SidebarNavProps) {

  // Fungsi untuk memeriksa apakah ada anak menu yang aktif
  const isChildActive = (children: NavItem[]) => {
    return children.some(child => child.view === activeView);
  }

  // State untuk mengontrol menu Riwayat
const [openCollapsible, setOpenCollapsible] = useState<string | null>(null);

  // --- LOGIKA BARU ---
  // Buka dropdown secara otomatis jika salah satu anaknya aktif
  useEffect(() => {
    let activeGroup: string | null = null;
    // Loop semua navItems untuk mencari grup yang aktif
    for (const item of navItems) {
      if (item.children && isChildActive(item.children)) {
        activeGroup = item.view; // e.g., 'history-group'
        break; // Hentikan loop jika sudah ketemu
      }
    }
    setOpenCollapsible(activeGroup);
  }, [activeView]); // Dijalankan setiap kali activeView berubah

  // --- FUNGSI BARU ---
  // Fungsi untuk toggle menu
  const handleToggle = (view: string) => {
    // Jika diklik pada grup yang sudah terbuka, tutup (set ke null)
    // Jika diklik pada grup yang tertutup, buka grup itu (set ke view)
    setOpenCollapsible(prevOpen => (prevOpen === view ? null : view));
  };


  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      className="hidden border-r bg-sidebar text-sidebar-foreground md:block"
    >
      <SidebarHeader className="flex h-16 items-center justify-center">
        <div onClick={() => setDashboardView('dashboard')} className="flex items-center gap-2 font-headline text-lg font-semibold text-primary-foreground cursor-pointer">
          <Printer className="h-7 w-7 text-accent" />
          <span className="group-data-[collapsible=icon]:hidden">MULTIPRINT</span>
        </div>
      </SidebarHeader>

      <SidebarMenu className="flex-1 p-2">
        {navItems.map((item) => (
          item.children ? (
            // --- Implementasi Collapsible Manual ---
            <React.Fragment key={item.view}>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleToggle(item.view)} // <-- LOGIKA BARU
                  isActive={isChildActive(item.children)}
                  tooltip={{
                    children: item.label,
                    className: 'font-headline',
                  }}
                  className="font-headline"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </div>
                    {/* --- LOGIKA BARU UNTUK PANAH --- */}
                    <ChevronDown 
                      className="h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden" 
                      style={{ 
                        transform: openCollapsible === item.view ? 'rotate(180deg)' : 'rotate(0deg)' 
                      }}
                    />
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* --- KONDISI RENDER BARU --- */}
              {/* Tampil jika 'openCollapsible' SAMA DENGAN 'item.view' */}
              {openCollapsible === item.view && (
                <div className="pl-4 group-data-[collapsible=icon]:hidden">
                  <SidebarMenu>
                    {item.children.map((child) => (
                      <SidebarMenuItem key={child.view}>
                        <SidebarMenuButton
                          onClick={() => setDashboardView(child.view)}
                          isActive={activeView === child.view}
                          tooltip={{
                            children: child.label,
                            className: 'font-headline',
                          }}
                          className="font-headline"
                        >
                          <child.icon className="h-5 w-5" />
                          <span>{child.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </div>
              )}
            </React.Fragment>
            // --- Batas Implementasi Manual ---
          ) : (
            // Render item menu biasa (tanpa children)
            <SidebarMenuItem key={item.view}>
              <SidebarMenuButton
                onClick={() => setDashboardView(item.view)}
                isActive={activeView === item.view}
                tooltip={{
                  children: item.label,
                  className: 'font-headline',
                }}
                className="font-headline"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        ))}
      </SidebarMenu>

      <SidebarFooter className="p-2">
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setDashboardView(settingsItem.view)}
            isActive={activeView === settingsItem.view}
            tooltip={{
              children: settingsItem.label,
              className: 'font-headline',
            }}
             className="font-headline"
          >
            <settingsItem.icon className="h-5 w-5" />
            <span>{settingsItem.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  );
}