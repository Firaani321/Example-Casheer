'use client';

import React from 'react';
import {
  Menu,
  Printer,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useSidebar } from '../ui/sidebar';

// Objek ini sekarang memetakan 'view' ke 'label'
const navItems = [
    { view: 'dashboard', label: 'Dashboard' },
    { view: 'projects', label: 'Proyek' },
    // --- GANTI BAGIAN INI ---
    { view: 'history-projects', label: 'Riwayat Proyek' },
    { view: 'history-expenses', label: 'Pengeluaran' },
    { view: 'history-income', label: 'Pemasukan' },
    // --- BATAS PERUBAHAN ---
    { view: 'customers', label: 'Pelanggan' },
    { view: 'payments', label: 'Pembayaran Pelanggan' },
    { view: 'partner-payments', label: 'Pembayaran Mitra' },
    { view: 'partner-receivables', label: 'Piutang Mitra' },
    // 'expenses' dan 'history' sudah diganti
    { view: 'monthly-report', label: 'Laporan Bulanan' }, // <-- Saya tambahkan ini agar konsisten
    { view: 'daily-report', label: 'Laporan Harian' },
    { view: 'settings', label: 'Pengaturan' },
];

// Buat pemetaan dari view ke judul untuk kemudahan pencarian
const pageTitles: { [key: string]: string } = navItems.reduce((acc, item) => {
    acc[item.view] = item.label;
    return acc;
}, {} as { [key: string]: string });


interface HeaderProps {
    activeView: string;
    setDashboardView: (view: string) => void;
}

export default function Header({ activeView, setDashboardView }: HeaderProps) {
    const { toggleSidebar } = useSidebar();

    // Dapatkan nama halaman saat ini dari activeView
    const currentPageName = pageTitles[activeView] || 'Dashboard';

  return (
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleSidebar}
            aria-label="Toggle Sidebar"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <span className="font-headline text-xl font-semibold">{currentPageName}</span>
        </nav>
        
        {/* Navigasi untuk Tampilan Mobile */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Buka menu navigasi</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader className="border-b mb-4 pb-4">
                <SheetTitle>
                    <div onClick={() => setDashboardView('dashboard')} className="flex items-center gap-2 font-headline text-lg font-semibold text-foreground cursor-pointer">
                        <Printer className="h-7 w-7 text-accent" />
                        <span>MULTIPRINT</span>
                    </div>
                </SheetTitle>
            </SheetHeader>
            <nav className="grid gap-4 text-base font-medium">
              {navItems.map(item => (
                <a
                    key={item.view}
                    onClick={() => { setDashboardView(item.view); }}
                    className={`transition-colors hover:text-foreground cursor-pointer ${activeView === item.view ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                    {item.label}
                </a>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Kosongkan area kanan header */}
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        </div>
      </header>
  );
}