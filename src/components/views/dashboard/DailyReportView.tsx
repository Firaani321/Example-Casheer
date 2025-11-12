'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoaderCircle, Eye, Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import {
  getCustomerPayments,
  getExpenses,
  getPartnerPayments,
  getPartnerReceivablePayments,
  getProjects,
  getCustomers,
  getPartnerReceivables,
  getDropdownData,
} from '@/lib/data-service';

import type {
  CustomerPayment,
  Expense,
  PartnerPayment,
  PartnerReceivablePayment,
  Project,
  Customer,
  PartnerReceivable,
  Partner,
} from '@/lib/types';

import { getDate, getMonth, getYear, format, isValid } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';

/* ===================== Types ===================== */

interface RawTransaction {
  id: string;
  created_at: string;
  description: string;
  amount: number;
  type: 'omset' | 'pengeluaran';
  detailName?: string;
  detailContext?: string;
}

interface DailyData {
  date: string; // "01".."31"
  dateIndex: number; // 1..31
  omset: number;
  pengeluaran: number;
  profit: number;
  transactions: RawTransaction[];
}

interface MonthlyData {
  month: string; // "Maret"
  monthIndex: number; // 0..11
  daily: DailyData[];
  totalOmset: number;
  totalPengeluaran: number;
  totalProfit: number;
}

interface YearlyData {
  year: number;
  monthly: MonthlyData[];
  totalOmset: number;
  totalPengeluaran: number;
  totalProfit: number;
}

/* ===================== Utils ===================== */

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

/* ===================== Processing ===================== */

const processDailyData = (
  customerPayments: CustomerPayment[],
  expenses: Expense[],
  partnerPayments: PartnerPayment[],
  partnerReceivablePayments: PartnerReceivablePayment[],
  projects: Project[],
  customers: Customer[],
  partnerReceivables: PartnerReceivable[],
  partners: Partner[]
): YearlyData[] => {
  const yearlyMap: Map<number, YearlyData> = new Map();

  const projectMap = new Map<string, Project>(projects.map((proj) => [proj.id, proj]));
  const customerMap = new Map<string, Customer>(customers.map((c) => [c.id, c]));
  const partnerMap = new Map<string, Partner>(partners.map((p) => [p.id, p]));
  const receivableMap = new Map<string, PartnerReceivable>(
    partnerReceivables.map((r) => [r.id, r])
  );

  type ProcessedTransaction = {
    type: 'omset' | 'pengeluaran';
    date: Date;
    amount: number;
    description: string;
    id: string;
    detailName?: string;
    detailContext?: string;
  };

  const allTransactions: ProcessedTransaction[] = [];

  // Omset: pembayaran customer
  customerPayments.forEach((p) => {
    const project = p.project_id ? projectMap.get(p.project_id) : undefined;
    const customer = project ? customerMap.get(project.customer_id) : undefined;

    allTransactions.push({
      type: 'omset',
      date: new Date(p.created_at),
      amount: (p as any).amount_paid ?? (p as any).amount ?? 0,
      description: 'Pembayaran Pelanggan',
      id: p.id,
      detailName: customer?.name,
      detailContext: project?.project_name,
    });
  });

  // Omset: pembayaran piutang mitra
  partnerReceivablePayments.forEach((p) => {
    const receivable = p.partner_receivable_id
      ? receivableMap.get(p.partner_receivable_id)
      : undefined;
    const partner = receivable ? partnerMap.get(receivable.partner_id) : undefined;

    allTransactions.push({
      type: 'omset',
      date: new Date(p.created_at),
      amount: (p as any).amount_paid ?? (p as any).amount ?? 0,
      description: 'Pembayaran Piutang Mitra',
      id: p.id,
      detailName: partner?.name,
      detailContext: receivable?.description,
    });
  });

  // Pengeluaran: biaya umum (tanpa project)
  expenses
    .filter((e) => !e.project_id)
    .forEach((e) => {
      allTransactions.push({
        type: 'pengeluaran',
        date: new Date(e.created_at),
        amount: (e as any).total_expense_amount ?? (e as any).amount ?? 0,
        description: e.description || 'Biaya',
        id: e.id,
      });
    });

  // Pengeluaran: pembayaran ke mitra/vendor
  partnerPayments.forEach((pp) => {
    const partner = (pp as any).partner_id ? partnerMap.get((pp as any).partner_id) : undefined;

    const paidAmount =
      (pp as any).amount_paid ??
      (pp as any).amount ??
      (pp as any).paid ??
      (pp as any).total_paid ??
      0;

    allTransactions.push({
      type: 'pengeluaran',
      date: new Date((pp as any).created_at),
      amount: paidAmount,
      description: 'Pembayaran ke Mitra',
      id: (pp as any).id,
      detailName: partner?.name,
      detailContext: (pp as any).description || undefined,
    });
  });

  // Bangun struktur tahun-bulan-hari
  allTransactions.forEach((t) => {
    if (!isValid(t.date)) return;

    const year = getYear(t.date);
    const month = getMonth(t.date);
    const date = getDate(t.date);

    if (!yearlyMap.has(year)) {
      yearlyMap.set(year, {
        year,
        monthly: Array.from({ length: 12 }, (_, monthIdx) => ({
          month: format(new Date(year, monthIdx), 'MMMM', { locale: indonesianLocale }),
          monthIndex: monthIdx,
          daily: Array.from({ length: 31 }, (_, dayIdx) => ({
            date: (dayIdx + 1).toString().padStart(2, '0'),
            dateIndex: dayIdx + 1,
            omset: 0,
            pengeluaran: 0,
            profit: 0,
            transactions: [],
          })),
          totalOmset: 0,
          totalPengeluaran: 0,
          totalProfit: 0,
        })),
        totalOmset: 0,
        totalPengeluaran: 0,
        totalProfit: 0,
      });
    }

    const yearData = yearlyMap.get(year)!;
    const monthData = yearData.monthly[month];
    const dailyData = monthData.daily[date - 1];

    if (dailyData) {
      const raw: RawTransaction = {
        id: t.id,
        created_at: t.date.toISOString(),
        description: t.description,
        amount: t.amount,
        type: t.type,
        detailName: t.detailName,
        detailContext: t.detailContext,
      };

      if (t.type === 'omset') dailyData.omset += t.amount;
      else dailyData.pengeluaran += t.amount;

      dailyData.transactions.push(raw);
    }
  });

  // Hitung total & potong bulan/hari berjalan
  const now = new Date();
  const currentYear = getYear(now);
  const currentMonthIndex = getMonth(now);
  const currentDayIndex = getDate(now);

  yearlyMap.forEach((y) => {
    y.monthly.forEach((m) => {
      if (y.year === currentYear && m.monthIndex === currentMonthIndex) {
        m.daily = m.daily.filter((d) => d.dateIndex <= currentDayIndex);
      }

      m.daily.forEach((d) => {
        d.profit = d.omset - d.pengeluaran;
        d.transactions.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      m.totalOmset = m.daily.reduce((acc, d) => acc + d.omset, 0);
      m.totalPengeluaran = m.daily.reduce((acc, d) => acc + d.pengeluaran, 0);
      m.totalProfit = m.totalOmset - m.totalPengeluaran;
    });

    if (y.year === currentYear) {
      y.monthly = y.monthly.filter((m) => m.monthIndex <= currentMonthIndex);
    }

    y.totalOmset = y.monthly.reduce((acc, m) => acc + m.totalOmset, 0);
    y.totalPengeluaran = y.monthly.reduce((acc, m) => acc + m.totalPengeluaran, 0);
    y.totalProfit = y.totalOmset - y.totalPengeluaran;
  });

  return Array.from(yearlyMap.values()).sort((a, b) => b.year - a.year);
};

/* ===================== Component ===================== */

export default function DailyReportView() {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<YearlyData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDailyData, setSelectedDailyData] = useState<{
    data: DailyData;
    dateLabel: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        customerPayments,
        expenses,
        partnerPayments,
        partnerReceivablePayments,
        projects,
        customers,
        partnerReceivables,
        partners,
      ] = await Promise.all([
        getCustomerPayments(),
        getExpenses(),
        getPartnerPayments(),
        getPartnerReceivablePayments(),
        getProjects(),
        getCustomers(),
        getPartnerReceivables(),
        getDropdownData('partners') as Promise<Partner[]>,
      ]);

      const processed = processDailyData(
        customerPayments,
        expenses,
        partnerPayments,
        partnerReceivablePayments,
        projects,
        customers,
        partnerReceivables,
        partners
      );

      setReportData(processed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal.';
      toast({
        variant: 'destructive',
        title: 'Gagal Memuat Laporan',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = (dailyData: DailyData, month: string, year: number) => {
    const dateLabel = `${dailyData.date} ${month} ${year}`;
    setSelectedDailyData({ data: dailyData, dateLabel });
  };

  const downloadFile = (filename: string, content: string) => {
    try {
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
      element.setAttribute('download', filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (e) {
      console.error('Gagal mengunduh file:', e);
      toast({
        variant: 'destructive',
        title: 'Gagal Mengunduh',
        description: 'Terjadi kesalahan saat mencoba membuat file laporan.',
      });
    }
  };

  const generateDailyReportText = (dailyData: DailyData, dateLabel: string): string => {
    let text = `Laporan Rinci Harian\n`;
    text += `Tanggal: ${dateLabel}\n`;
    text += `========================================\n\n`;

    text += `--- PEMASUKAN (OMSET) ---\n`;
    const omsetTx = dailyData.transactions.filter((t) => t.type === 'omset');
    if (omsetTx.length > 0) {
      omsetTx.forEach((t) => {
        let detail = t.description.replace(/\n/g, ' ');
        if (t.detailName || t.detailContext) {
          detail += ` (${t.detailName || ''}${t.detailContext ? ` - ${t.detailContext}` : ''})`;
        }
        text += `${format(new Date(t.created_at), 'HH:mm')} - ${detail}: ${formatCurrency(
          t.amount
        )}\n`;
      });
    } else {
      text += 'Tidak ada pemasukan.\n';
    }
    text += `\nTOTAL OMSET: ${formatCurrency(dailyData.omset)}\n\n`;

    text += `--- PENGELUARAN ---\n`;
    const pengeluaranTx = dailyData.transactions.filter((t) => t.type === 'pengeluaran');
    if (pengeluaranTx.length > 0) {
      pengeluaranTx.forEach((t) => {
        const detail = t.description.replace(/\n/g, ' ');
        text += `${format(new Date(t.created_at), 'HH:mm')} - ${detail}: ${formatCurrency(
          t.amount
        )}\n`;
      });
    } else {
      text += 'Tidak ada pengeluaran.\n';
    }
    text += `\nTOTAL PENGELUARAN: ${formatCurrency(dailyData.pengeluaran)}\n\n`;

    text += `========================================\n`;
    text += `PROFIT BERSIH: ${formatCurrency(dailyData.profit)}\n`;

    return text;
  };

  const generateMonthlyReportText = (monthData: MonthlyData, year: number): string => {
    let text = `Laporan Ringkas Bulanan\n`;
    text += `Bulan: ${monthData.month} ${year}\n`;
    text += `========================================\n\n`;
    text += `RINGKASAN HARIAN:\n`;

    const filteredDays = monthData.daily.filter((d) => d.omset > 0 || d.pengeluaran > 0);
    if (filteredDays.length > 0) {
      filteredDays.forEach((d) => {
        text += `Tanggal ${d.date}: Omset ${formatCurrency(d.omset)}, Pengeluaran ${formatCurrency(
          d.pengeluaran
        )}, Profit ${formatCurrency(d.profit)}\n`;
      });
    } else {
      text += 'Tidak ada transaksi pada bulan ini.\n';
    }

    text += `\n========================================\n`;
    text += `TOTAL OMSET BULANAN: ${formatCurrency(monthData.totalOmset)}\n`;
    text += `TOTAL PENGELUARAN BULANAN: ${formatCurrency(monthData.totalPengeluaran)}\n`;
    text += `TOTAL PROFIT BULANAN: ${formatCurrency(monthData.totalProfit)}\n`;

    return text;
  };

  const generateYearlyReportText = (yearData: YearlyData): string => {
    let text = `Laporan Ringkas Tahunan\n`;
    text += `Tahun: ${yearData.year}\n`;
    text += `========================================\n\n`;
    text += `RINGKASAN BULANAN:\n`;

    const filteredMonths = yearData.monthly.filter((m) => m.totalOmset > 0 || m.totalPengeluaran > 0);
    if (filteredMonths.length > 0) {
      filteredMonths.forEach((m) => {
        text += `Bulan ${m.month}: Omset ${formatCurrency(m.totalOmset)}, Pengeluaran ${formatCurrency(
          m.totalPengeluaran
        )}, Profit ${formatCurrency(m.totalProfit)}\n`;
      });
    } else {
      text += 'Tidak ada transaksi pada tahun ini.\n';
    }

    text += `\n========================================\n`;
    text += `TOTAL OMSET TAHUNAN: ${formatCurrency(yearData.totalOmset)}\n`;
    text += `TOTAL PENGELUARAN TAHUNAN: ${formatCurrency(yearData.totalPengeluaran)}\n`;
    text += `TOTAL PROFIT TAHUNAN: ${formatCurrency(yearData.totalProfit)}\n`;

    return text;
  };

  const handleDownloadDaily = (dailyData: DailyData, month: string, year: number) => {
    const dateLabel = `${dailyData.date} ${month} ${year}`;
    const filename = `Laporan_Harian_${year}-${month.substring(0, 3)}-${dailyData.date}.txt`;
    const textContent = generateDailyReportText(dailyData, dateLabel);
    downloadFile(filename, textContent);
  };

  const handleDownloadMonthly = (monthData: MonthlyData, year: number) => {
    const filename = `Laporan_Bulanan_${year}-${monthData.month}.txt`;
    const textContent = generateMonthlyReportText(monthData, year);
    downloadFile(filename, textContent);
  };

  const handleDownloadYearly = (yearData: YearlyData) => {
    const filename = `Laporan_Tahunan_${yearData.year}.txt`;
    const textContent = generateYearlyReportText(yearData);
    downloadFile(filename, textContent);
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Laporan Keuangan Harian</CardTitle>
          <CardDescription>
            Ringkasan omset, pengeluaran kas riil, dan profit bersih untuk setiap hari.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {reportData && reportData.length > 0 ? (
            <Accordion type="single" collapsible defaultValue={`year-${reportData[0].year}`}>
              {reportData.map((yearData) => (
                <AccordionItem value={`year-${yearData.year}`} key={yearData.year}>
                  {/* Header Tahun (tanpa tombol) */}
                  <AccordionTrigger className="flex w-full items-center justify-between text-xl font-semibold font-headline">
                    <span>Tahun {yearData.year}</span>
                  </AccordionTrigger>

                  <AccordionContent>
                    {/* List Bulan */}
                    <Accordion
                      type="single"
                      collapsible
                      className="w-full"
                      defaultValue={`month-${getYear(new Date())}-${getMonth(new Date())}`}
                    >
                      {yearData.monthly
                        .filter((m) => m.totalOmset > 0 || m.totalPengeluaran > 0)
                        .map((monthData) => (
                          <AccordionItem
                            value={`month-${yearData.year}-${monthData.monthIndex}`}
                            key={monthData.monthIndex}
                          >
                            {/* Header Bulan (tanpa tombol) */}
                            <AccordionTrigger className="flex w-full items-center justify-between text-lg font-semibold">
                              <span>{monthData.month}</span>
                            </AccordionTrigger>

                            <AccordionContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[180px]">Tanggal</TableHead>
                                    <TableHead className="text-right">Total Omset</TableHead>
                                    <TableHead className="text-right">Total Pengeluaran</TableHead>
                                    <TableHead className="text-right">Profit Bersih</TableHead>
                                    <TableHead className="w-[100px] text-right">Aksi Harian</TableHead>
                                  </TableRow>
                                </TableHeader>

                                <TableBody>
                                  {(() => {
                                    const filteredDaily = monthData.daily.filter(
                                      (d) => d.omset > 0 || d.pengeluaran > 0
                                    );

                                    if (filteredDaily.length === 0) {
                                      return (
                                        <TableRow>
                                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                                            Tidak ada transaksi untuk bulan ini.
                                          </TableCell>
                                        </TableRow>
                                      );
                                    }

                                    return filteredDaily.map((daily) => (
                                      <TableRow
                                        key={`${yearData.year}-${monthData.monthIndex}-${daily.dateIndex}`}
                                        className={daily.profit < 0 ? 'bg-destructive/10' : ''}
                                      >
                                        <TableCell className="font-medium">
                                          {daily.date} {monthData.month} {yearData.year}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(daily.omset)}</TableCell>
                                        <TableCell className="text-right text-red-600">
                                          {formatCurrency(daily.pengeluaran)}
                                        </TableCell>
                                        <TableCell
                                          className={`text-right font-semibold ${
                                            daily.profit >= 0 ? 'text-green-600' : 'text-destructive'
                                          }`}
                                        >
                                          {formatCurrency(daily.profit)}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center justify-end space-x-2">
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() =>
                                                handleViewDetail(daily, monthData.month, yearData.year)
                                              }
                                              title="Lihat Detail Harian"
                                            >
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() =>
                                                handleDownloadDaily(daily, monthData.month, yearData.year)
                                              }
                                              title="Unduh Laporan Harian"
                                            >
                                              <Download className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ));
                                  })()}
                                </TableBody>

                                {/* FOOTER BULANAN + TOMBOL DOWNLOAD DI KANAN */}
                                <TableFooter>
                                  <TableRow className="bg-muted/50">
                                    <TableHead>Total Bulanan</TableHead>
                                    <TableHead className="text-right font-bold">
                                      {formatCurrency(monthData.totalOmset)}
                                    </TableHead>
                                    <TableHead className="text-right font-bold text-red-600">
                                      {formatCurrency(monthData.totalPengeluaran)}
                                    </TableHead>
                                    <TableHead
                                      className={`text-right font-bold ${
                                        monthData.totalProfit >= 0 ? 'text-green-600' : 'text-destructive'
                                      }`}
                                    >
                                      {formatCurrency(monthData.totalProfit)}
                                    </TableHead>
                                    <TableHead className="w-[100px]">
                                      <div className="flex items-center justify-end">
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() => handleDownloadMonthly(monthData, yearData.year)}
                                          title="Unduh Laporan Bulanan"
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableHead>
                                  </TableRow>
                                </TableFooter>
                              </Table>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                    </Accordion>

                    {/* FOOTER TAHUNAN + TOMBOL DOWNLOAD DI KANAN */}
                    <Table className="mt-4">
                      <TableFooter>
                        <TableRow className="bg-muted/50 border-t-2 border-primary">
                          <TableHead>Total Tahunan ({yearData.year})</TableHead>
                          <TableHead className="text-right font-bold">
                            {formatCurrency(yearData.totalOmset)}
                          </TableHead>
                          <TableHead className="text-right font-bold text-red-600">
                            {formatCurrency(yearData.totalPengeluaran)}
                          </TableHead>
                          <TableHead
                            className={`text-right font-bold ${
                              yearData.totalProfit >= 0 ? 'text-green-600' : 'text-destructive'
                            }`}
                          >
                            {formatCurrency(yearData.totalProfit)}
                          </TableHead>
                          <TableHead className="w-[100px]">
                            <div className="flex items-center justify-end">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDownloadYearly(yearData)}
                                title="Unduh Laporan Tahunan"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
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

      {/* Modal Detail Transaksi */}
      <Dialog open={!!selectedDailyData} onOpenChange={(isOpen) => !isOpen && setSelectedDailyData(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detail Transaksi: {selectedDailyData?.dateLabel}</DialogTitle>
          </DialogHeader>

          <div className="flex-grow overflow-y-auto pr-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Omset */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-green-600">Pemasukan (Omset)</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDailyData?.data.transactions
                      .filter((t) => t.type === 'omset')
                      .map((tx) => (
                        <TableRow key={`omset-${tx.id}`}>
                          <TableCell>
                            {tx.description}
                            {(tx.detailName || tx.detailContext) && (
                              <span className="block text-sm text-muted-foreground whitespace-normal">
                                {tx.detailName}
                                {tx.detailContext ? ` - ${tx.detailContext}` : ''}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(tx.amount)}</TableCell>
                        </TableRow>
                      ))}
                    {selectedDailyData?.data.transactions.filter((t) => t.type === 'omset').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Tidak ada pemasukan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableHead colSpan={2}>Total Omset</TableHead>
                      <TableHead className="text-right font-bold">
                        {formatCurrency(selectedDailyData?.data.omset || 0)}
                      </TableHead>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              {/* Pengeluaran */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-destructive">Pengeluaran</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDailyData?.data.transactions
                      .filter((t) => t.type === 'pengeluaran')
                      .map((tx) => (
                        <TableRow key={`pengeluaran-${tx.id}`}>
                          <TableCell>
                            {tx.description}
                            {(tx.detailName || tx.detailContext) && (
                              <span className="block text-sm text-muted-foreground whitespace-normal">
                                {tx.detailName}
                                {tx.detailContext ? ` - ${tx.detailContext}` : ''}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(tx.amount)}</TableCell>
                        </TableRow>
                      ))}
                    {selectedDailyData?.data.transactions.filter((t) => t.type === 'pengeluaran').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Tidak ada pengeluaran.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableHead colSpan={2}>Total Pengeluaran</TableHead>
                      <TableHead className="text-right font-bold">
                        {formatCurrency(selectedDailyData?.data.pengeluaran || 0)}
                      </TableHead>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>
          </div>

          {/* Profit Bersih */}
          <div className="border-t pt-4 mt-4">
            <div
              className={`flex justify-between items-center text-xl font-bold ${
                (selectedDailyData?.data.profit || 0) >= 0 ? 'text-green-600' : 'text-destructive'
              }`}
            >
              <span>PROFIT BERSIH:</span>
              <span>{formatCurrency(selectedDailyData?.data.profit || 0)}</span>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline">
                <X className="h-4 w-4 mr-2" />
                Tutup
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
