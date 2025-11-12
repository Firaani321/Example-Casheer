'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Hourglass, Landmark, Wallet, Scale } from 'lucide-react';
import type { Project, Customer, Expense, CustomerPayment, PartnerPayment, PartnerReceivable, PartnerReceivablePayment } from '@/lib/types';
import { useMemo } from 'react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

interface OverviewCardsProps {
  projects: Project[];
  customers: Customer[];
  expenses: Expense[];
  customerPayments: CustomerPayment[];
  partnerPayments: PartnerPayment[];
  partnerReceivables: PartnerReceivable[];
  partnerReceivablePayments: PartnerReceivablePayment[];
}

export default function OverviewCards({ projects, customers, expenses, customerPayments, partnerPayments, partnerReceivables, partnerReceivablePayments }: OverviewCardsProps) {
  const stats = useMemo(() => {
    // Kalkulasi Total Uang Masuk & Keluar
    const totalCashInFromProjects = customerPayments.reduce((sum, p) => sum + p.amount_paid, 0);
    const totalCashInFromPartners = partnerReceivablePayments.reduce((sum, p) => sum + p.amount_paid, 0);
    const totalCashInflow = totalCashInFromProjects + totalCashInFromPartners;

    const totalCashOutflow = expenses.filter(e => !e.project_id).reduce((sum, e) => sum + e.total_expense_amount, 0);
    const remainingCash = totalCashInflow - totalCashOutflow;

    // Kalkulasi Piutang Pelanggan
    const customerReceivables = projects.filter((p) => ['Belum Lunas', 'Dibayar Sebagian'].includes(p.payment_status)).reduce((sum, p) => sum + p.remaining_payment, 0);
    
    // Kalkulasi Utang ke Mitra
    const totalPartnerExpenses = expenses.filter(e => e.partner_id && e.project_id).reduce((sum, e) => sum + e.total_expense_amount, 0);
    const totalPaidToPartners = partnerPayments.reduce((sum, pp) => sum + pp.amount, 0);
    const debtToPartners = totalPartnerExpenses - totalPaidToPartners;

    // Kalkulasi Piutang dari Mitra (yang belum dibayar)
    const partnerReceivablesTotal = partnerReceivables.reduce((sum, pr) => sum + (pr.remaining_amount ?? pr.amount), 0);
    
    // Kalkulasi Proyek Aktif
    const activeProjects = projects.filter((p) => ['Dikerjakan', 'Tertunda'].includes(p.project_status)).length;
    
    return { 
      remainingCash,
      customerReceivables, 
      debtToPartners, 
      partnerReceivablesTotal, 
      activeProjects, 
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, expenses, customerPayments, partnerPayments, partnerReceivables, partnerReceivablePayments]);

  const cardData = [
    { title: 'Sisa Uang', icon: Wallet, value: formatCurrency(stats.remainingCash), description: 'Total omset dikurangi total pengeluaran kas riil' },
    { title: 'Piutang Pelanggan', icon: Hourglass, value: formatCurrency(stats.customerReceivables), description: 'Total sisa tagihan dari semua pelanggan' },
    { title: 'Utang ke Mitra', icon: Landmark, value: formatCurrency(stats.debtToPartners > 0 ? stats.debtToPartners : 0), description: 'Total sisa biaya yang harus dibayar ke mitra' },
    { title: 'Piutang dari Mitra', icon: Scale, value: formatCurrency(stats.partnerReceivablesTotal), description: 'Total tagihan Anda kepada mitra' },
    { title: 'Proyek Aktif', icon: Package, value: `${stats.activeProjects}`, description: 'Proyek berstatus Dikerjakan/Tertunda' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5">
      {cardData.map((card, index) => (
        <Card key={index} className={['Sisa Uang'].includes(card.title) ? 'bg-secondary' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground pt-1">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
