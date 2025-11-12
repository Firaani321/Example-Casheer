'use client';

import React, { useState } from 'react';
import SidebarNav from '@/components/shared/sidebar-nav';
import Header from '@/components/shared/header';
import { SidebarProvider } from '@/components/ui/sidebar';

// Impor komponen tampilan yang sebenarnya
import DashboardView from '@/components/views/dashboard/DashboardView';
import ProjectsView from '@/components/views/dashboard/ProjectsView';
import CustomersView from '@/components/views/dashboard/CustomersView';
import ExpensesView from '@/components/views/dashboard/ExpensesView';
import HistoryView from '@/components/views/dashboard/HistoryView';
import MonthlyReportView from '@/components/views/dashboard/MonthlyReportView';
import PartnerPaymentsView from '@/components/views/dashboard/PartnerPaymentsView';
import PartnerReceivablesView from '@/components/views/dashboard/PartnerReceivablesView';
import PartnersView from '@/components/views/dashboard/PartnersView';
import SettingsView from '@/components/views/dashboard/SettingsView';
import CustomerPaymentsPage from '@/components/views/dashboard/CustomerPaymentsPage';
import DailyReportView from '@/components/views/dashboard/DailyReportView';
import IncomeView from '@/components/views/dashboard/IncomeView';


export default function DashboardLayout() {
    const [currentDashboardView, setCurrentDashboardView] = useState('dashboard');

    const setDashboardView = (view: string) => {
        setCurrentDashboardView(view);
    };

    // Fungsi untuk render komponen tampilan berdasarkan state.
    const renderDashboardView = () => {
        switch (currentDashboardView) {
            case 'dashboard':
                return <DashboardView />;
            case 'projects':
                return <ProjectsView />;
            case 'customers':
                return <CustomersView />;
            case 'payments':
                return <CustomerPaymentsPage />;
            
            // --- GANTI CASE DI BAWAH INI ---
            case 'history-projects': // <-- 'history' diubah menjadi 'history-projects'
                return <HistoryView />;
            case 'history-expenses': // <-- 'expenses' diubah menjadi 'history-expenses'
                return <ExpensesView />;
            case 'history-income': // <-- 'income-report' diubah menjadi 'history-income'
                return <IncomeView />;
            // --- BATAS PERUBAHAN ---

            case 'monthly-report':
                return <MonthlyReportView />;
            case 'partner-payments':
                return <PartnerPaymentsView />;
            case 'partner-receivables':
                return <PartnerReceivablesView />;
            case 'partners':
                return <PartnersView />;
            case 'settings':
                return <SettingsView />;
            case 'daily-report':
                return <DailyReportView />;
            
            // Hapus case 'expenses', 'history', dan 'income-report' jika masih ada
            
            default:
                return <DashboardView />;
        }
    };

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-background">
                <SidebarNav 
                    activeView={currentDashboardView}
                    setDashboardView={setDashboardView} 
                    // handleLogout={() => {}} // Anda sepertinya punya prop ini di file asli
                />
                <div className="flex flex-1 flex-col">
                    <Header 
                        activeView={currentDashboardView}
                        setDashboardView={setDashboardView}
                        // handleLogout={() => {}} // Anda sepertinya punya prop ini di file asli
                    />
                    <main className="flex-1 p-4 md:p-6 lg:p-8">
                        {renderDashboardView()}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}