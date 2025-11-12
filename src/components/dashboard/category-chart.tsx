'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Project } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, getMonth, isValid, format } from 'date-fns';
import { id } from 'date-fns/locale';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

interface CategoryChartProps {
  projects: Project[];
}

const getAvailableYears = (projects: Project[]): number[] => {
    const years = new Set<number>();
    projects.forEach(p => {
        const date = new Date(p.created_at);
        if (isValid(date)) years.add(getYear(date));
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    if (sortedYears.length === 0) {
        return [getYear(new Date())];
    }
    return sortedYears;
}

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(0, i), 'MMMM', { locale: id }),
}));


const processCategoryData = (projects: Project[], year: number, month: number) => {
  const categoryCounts: { [key: string]: number } = {};

  const filteredProjects = projects.filter(project => {
    const projectDate = new Date(project.created_at);
    return isValid(projectDate) && getYear(projectDate) === year && getMonth(projectDate) === month;
  });

  filteredProjects.forEach((project) => {
    const category = project.category || 'Lainnya';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  return Object.entries(categoryCounts)
    .map(([name, value], index) => ({
      name,
      value,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12px" fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function CategoryChart({ projects }: CategoryChartProps) {
  const availableYears = useMemo(() => getAvailableYears(projects), [projects]);
  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(new Date()));

  const chartData = useMemo(() => processCategoryData(projects, selectedYear, selectedMonth), [projects, selectedYear, selectedMonth]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="mb-4 sm:mb-0">
                <CardTitle className="font-headline">Popularitas Kategori</CardTitle>
                <CardDescription>
                Distribusi proyek berdasarkan kategori.
                </CardDescription>
            </div>
            <div className="flex gap-2">
                <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Pilih Bulan" />
                    </SelectTrigger>
                    <SelectContent>
                        {monthOptions.map(month => (
                            <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                    <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Pilih Tahun" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(year => (
                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
            <PieChart>
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                    }}
                    cursor={{ fill: 'hsla(var(--primary), 0.1)' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: "14px", paddingBottom: "20px"}}/>
                <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={120}
                dataKey="value"
                nameKey="name"
                >
                {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />
                ))}
                </Pie>
            </PieChart>
            </ResponsiveContainer>
        ) : (
            <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                Tidak ada data proyek untuk periode yang dipilih.
            </div>
        )}
      </CardContent>
    </Card>
  );
}
