'use client';

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CustomerPayment, Expense, PartnerPayment, PartnerReceivablePayment } from '@/lib/types';
import React, { useMemo, useState } from 'react';
import { format, getYear, startOfYear, endOfYear, eachMonthOfInterval, isValid, getMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TurnoverChartProps {
  customerPayments: CustomerPayment[];
  expenses: Expense[];
  partnerPayments: PartnerPayment[];
  partnerReceivablePayments: PartnerReceivablePayment[];
}

const processChartData = (customerPayments: CustomerPayment[], expenses: Expense[], partnerPayments: PartnerPayment[], partnerReceivablePayments: PartnerReceivablePayment[], year: number) => {
  const yearDate = new Date(year, 0, 1);
  if (!isValid(yearDate)) return [];

  const interval = { start: startOfYear(yearDate), end: endOfYear(yearDate) };
  const monthsInYear = eachMonthOfInterval(interval);

  const monthlyData: { [key: string]: { month: string; "Uang Masuk": number; "Pengeluaran": number } } = {};

  monthsInYear.forEach(monthDate => {
    const monthName = format(monthDate, 'MMM', { locale: id });
    monthlyData[monthName] = { month: monthName, "Uang Masuk": 0, "Pengeluaran": 0 };
  });

  // Uang masuk dari proyek
  customerPayments.forEach((payment) => {
    const paymentDate = new Date(payment.created_at);
    if (isValid(paymentDate) && getYear(paymentDate) === year) {
      const monthName = format(paymentDate, 'MMM', { locale: id });
      if (monthlyData[monthName]) {
        monthlyData[monthName]["Uang Masuk"] += payment.amount_paid;
      }
    }
  });

  // Uang masuk dari pembayaran piutang mitra
  partnerReceivablePayments.forEach((payment) => {
    const paymentDate = new Date(payment.created_at);
    if (isValid(paymentDate) && getYear(paymentDate) === year) {
      const monthName = format(paymentDate, 'MMM', { locale: id });
      if (monthlyData[monthName]) {
        monthlyData[monthName]["Uang Masuk"] += payment.amount_paid;
      }
    }
  });
  
  // Hanya hitung pengeluaran umum (yang tidak ada project_id)
  expenses.forEach((expense) => {
    const expenseDate = new Date(expense.created_at);
     if (isValid(expenseDate) && getYear(expenseDate) === year && !expense.project_id) {
      const monthName = format(expenseDate, 'MMM', { locale: id });
      if (monthlyData[monthName]) {
        monthlyData[monthName]["Pengeluaran"] += expense.total_expense_amount;
      }
    }
  });

  return Object.values(monthlyData);
};

const getAvailableYears = (customerPayments: CustomerPayment[], expenses: Expense[], partnerPayments: PartnerPayment[], partnerReceivablePayments: PartnerReceivablePayment[]): number[] => {
    const years = new Set<number>();
    customerPayments.forEach(p => {
        const date = new Date(p.created_at);
        if (isValid(date)) years.add(getYear(date));
    });
     partnerReceivablePayments.forEach(p => {
        const date = new Date(p.created_at);
        if (isValid(date)) years.add(getYear(date));
    });
    expenses.forEach(e => {
        const date = new Date(e.created_at);
        if (isValid(date)) years.add(getYear(date));
    });
    partnerPayments.forEach(p => {
        const date = new Date(p.created_at);
        if (isValid(date)) years.add(getYear(date));
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    if (sortedYears.length === 0) {
        return [getYear(new Date())];
    }
    return sortedYears;
}


export default function TurnoverChart({ customerPayments, expenses, partnerPayments, partnerReceivablePayments }: TurnoverChartProps) {
  const availableYears = useMemo(() => getAvailableYears(customerPayments, expenses, partnerPayments, partnerReceivablePayments), [customerPayments, expenses, partnerPayments, partnerReceivablePayments]);
  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0] || getYear(new Date()));

  const chartData = useMemo(() => processChartData(customerPayments, expenses, partnerPayments, partnerReceivablePayments, selectedYear), [customerPayments, expenses, partnerPayments, partnerReceivablePayments, selectedYear]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
                <CardTitle className="font-headline">Arus Kas Tahunan</CardTitle>
                <CardDescription>
                Perbandingan total uang masuk vs pengeluaran kas riil bulanan.
                </CardDescription>
            </div>
            <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                    {availableYears.map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `Rp${new Intl.NumberFormat('id-ID', {notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 0}).format(value as number)}`}
              width={80}
            />
            <Tooltip
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                }}
                cursor={{ fill: 'hsla(var(--primary), 0.1)' }}
                formatter={(value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value as number)}
            />
            <Legend wrapperStyle={{fontSize: "14px"}} />
            <defs>
              <linearGradient id="colorUangMasuk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPengeluaran" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="Uang Masuk" stroke="hsl(var(--chart-1))" fill="url(#colorUangMasuk)" strokeWidth={2} />
            <Line type="monotone" dataKey="Uang Masuk" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            
            <Area type="monotone" dataKey="Pengeluaran" stroke="hsl(var(--chart-2))" fill="url(#colorPengeluaran)" strokeWidth={2} />
            <Line type="monotone" dataKey="Pengeluaran" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}/>
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
