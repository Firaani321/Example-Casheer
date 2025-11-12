'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCustomerPayments, getExpenses, getPartnerPayments, getPartnerReceivablePayments } from '@/lib/data-service';
import type { CustomerPayment, Expense, PartnerPayment, PartnerReceivablePayment } from '@/lib/types';
import { getMonth, getYear, format, isValid } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';

interface MonthlyData {
  month: string;
  monthIndex: number;
  omset: number;
  pengeluaran: number;
  profit: number;
}

interface YearlyData {
  year: number;
  months: MonthlyData[];
  totalOmset: number;
  totalPengeluaran: number;
  totalProfit: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);


const processMonthlyData = (
    customerPayments: CustomerPayment[], 
    expenses: Expense[], 
    partnerPayments: PartnerPayment[],
    partnerReceivablePayments: PartnerReceivablePayment[]
): YearlyData[] => {
    const yearlyMap: Map<number, YearlyData> = new Map();

    const allTransactions: { type: 'omset' | 'pengeluaran'; date: Date; amount: number }[] = [];

    // Omset: Uang masuk dari pelanggan
    customerPayments.forEach(p => {
        allTransactions.push({ type: 'omset', date: new Date(p.created_at), amount: p.amount_paid });
    });
    
    // Omset: Uang masuk dari pembayaran piutang mitra
    partnerReceivablePayments.forEach(p => {
        allTransactions.push({ type: 'omset', date: new Date(p.created_at), amount: p.amount_paid });
    });


    // Pengeluaran: Biaya umum (bukan utang ke mitra)
    expenses.filter(e => !e.project_id).forEach(e => {
        allTransactions.push({ type: 'pengeluaran', date: new Date(e.created_at), amount: e.total_expense_amount });
    });

    allTransactions.forEach(t => {
        if (!isValid(t.date)) return;

        const year = getYear(t.date);
        const monthIndex = getMonth(t.date);
        
        if (!yearlyMap.has(year)) {
            yearlyMap.set(year, {
                year,
                months: Array.from({ length: 12 }, (_, i) => ({
                    month: format(new Date(year, i), 'MMMM', { locale: indonesianLocale }),
                    monthIndex: i,
                    omset: 0,
                    pengeluaran: 0,
                    profit: 0
                })),
                totalOmset: 0,
                totalPengeluaran: 0,
                totalProfit: 0
            });
        }
        
        const yearData = yearlyMap.get(year)!;
        const monthData = yearData.months[monthIndex];

        if(t.type === 'omset') {
            monthData.omset += t.amount;
        } else {
            monthData.pengeluaran += t.amount;
        }
    });

    yearlyMap.forEach(yearData => {
        yearData.months.forEach(monthData => {
            monthData.profit = monthData.omset - monthData.pengeluaran;
        });

        // Filter out future months with no data
        const currentMonthIndex = getMonth(new Date());
        const currentYear = getYear(new Date());
        if (yearData.year === currentYear) {
            yearData.months = yearData.months.filter(m => m.monthIndex <= currentMonthIndex);
        }

        yearData.totalOmset = yearData.months.reduce((acc, m) => acc + m.omset, 0);
        yearData.totalPengeluaran = yearData.months.reduce((acc, m) => acc + m.pengeluaran, 0);
        yearData.totalProfit = yearData.totalOmset - yearData.totalPengeluaran;
    });
    
    return Array.from(yearlyMap.values()).sort((a,b) => b.year - a.year);
};


export default function MonthlyReportView() {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<YearlyData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [customerPayments, expenses, partnerPayments, partnerReceivablePayments] = await Promise.all([
        getCustomerPayments(),
        getExpenses(),
        getPartnerPayments(),
        getPartnerReceivablePayments()
      ]);
      
      const processedData = processMonthlyData(customerPayments, expenses, partnerPayments, partnerReceivablePayments);
      setReportData(processedData);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
        toast({
            variant: 'destructive',
            title: 'Gagal Memuat Laporan',
            description: errorMessage,
        });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Laporan Keuangan Bulanan</CardTitle>
        <CardDescription>
          Ringkasan omset, pengeluaran kas riil, dan profit bersih untuk setiap bulan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reportData && reportData.length > 0 ? (
            <Accordion type="single" collapsible defaultValue={`year-${reportData[0].year}`}>
                {reportData.map(yearData => (
                <AccordionItem value={`year-${yearData.year}`} key={yearData.year}>
                    <AccordionTrigger className="text-xl font-semibold font-headline">
                        Tahun {yearData.year}
                    </AccordionTrigger>
                    <AccordionContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Bulan</TableHead>
                            <TableHead className="text-right">Total Omset</TableHead>
                            <TableHead className="text-right">Total Pengeluaran</TableHead>
                            <TableHead className="text-right">Profit Bersih</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {yearData.months.map((month) => (
                           (month.omset > 0 || month.pengeluaran > 0) && (
                            <TableRow key={month.month} className={month.profit < 0 ? 'bg-destructive/10' : ''}>
                                <TableCell className="font-medium">{month.month}</TableCell>
                                <TableCell className="text-right">{formatCurrency(month.omset)}</TableCell>
                                <TableCell className="text-right text-red-600">{formatCurrency(month.pengeluaran)}</TableCell>
                                <TableCell className={`text-right font-semibold ${month.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                    {formatCurrency(month.profit)}
                                </TableCell>
                            </TableRow>
                           )
                        ))}
                        </TableBody>
                         <TableFooter>
                            <TableRow className="bg-muted/50">
                                <TableHead>Total Tahunan</TableHead>
                                <TableHead className="text-right font-bold">{formatCurrency(yearData.totalOmset)}</TableHead>
                                <TableHead className="text-right font-bold text-red-600">{formatCurrency(yearData.totalPengeluaran)}</TableHead>
                                <TableHead className={`text-right font-bold ${yearData.totalProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                    {formatCurrency(yearData.totalProfit)}
                                </TableHead>
                            </TableRow>
                        </TableFooter>
                    </Table>
                    </AccordionContent>
                </AccordionItem>
                ))}
            </Accordion>
        ) : (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                Tidak ada data transaksi yang ditemukan untuk membuat laporan.
            </div>
        )}
      </CardContent>
    </Card>
  );
}
