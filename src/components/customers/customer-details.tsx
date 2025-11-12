/* eslint-disable max-len */
'use client';

import React, { useMemo, useState, useTransition } from 'react';
// Impor tipe Handler
import type { Customer, Project, CustomerPayment, Handler } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Search, ArrowLeft, Download, LoaderCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx'; // Import library Excel

// Helper format mata uang
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

// Helper varian status
const paymentStatusVariant: { [key in Project['payment_status']]: 'default' | 'secondary' | 'destructive' } = {
    'Lunas': 'default',
    'Dibayar Sebagian': 'secondary',
    'Belum Lunas': 'destructive',
}

// --- Komponen Kotak Statistik ---
interface StatBoxProps {
    title: string;
    value: string;
    variant?: 'default' | 'success' | 'destructive';
}

function StatBox({ title, value, variant = 'default' }: StatBoxProps) {
    const valueColor = {
        'default': 'text-foreground',
        'success': 'text-green-600',
        'destructive': 'text-red-600',
    }[variant];

    return (
        <div className="rounded-md border bg-card p-3 text-center shadow-sm w-36">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className={`font-bold text-lg ${valueColor}`}>{value}</p>
        </div>
    );
}

// --- Interface Prop (Diperbarui) ---
interface CustomerDetailsProps {
    customer: Customer;
    allProjects: Project[];
    allCustomerPayments: CustomerPayment[];
    allHandlers: Handler[]; // Prop baru untuk mapping nama handler
    onBack: () => void; // Prop untuk kembali
}

// --- KOMPONEN UTAMA ---
export default function CustomerDetails({ customer, allProjects, allCustomerPayments, allHandlers, onBack }: CustomerDetailsProps) {
    const { toast } = useToast();
    const [isDownloading, startDownloadTransition] = useTransition();
    
    // State untuk search dan selection
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

    // Kalkulasi data pelanggan
    const customerData = useMemo(() => {
        const projects = allProjects
            .filter(p => p.customer_id === customer.id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Di sini tetap sort terbaru dulu untuk tampilan UI
        const payments = allCustomerPayments.filter(p => projects.some(proj => proj.id === p.project_id));
        const totalProjectValue = projects.reduce((sum, p) => sum + p.total_price, 0);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
        const totalRemaining = totalProjectValue - totalPaid;
        return { projects, payments, totalProjectValue, totalPaid, totalRemaining };
    }, [customer.id, allProjects, allCustomerPayments]);

    // Filter proyek berdasarkan pencarian
    const filteredProjects = useMemo(() => {
        const query = searchQuery.toLowerCase();
        if (!query) return customerData.projects;

        return customerData.projects.filter(project => {
            const projectDate = format(new Date(project.created_at), 'dd/MM/yyyy');
            return (
                project.project_name.toLowerCase().includes(query) ||
                projectDate.includes(query) ||
                project.payment_status.toLowerCase().includes(query) ||
                project.total_price.toString().includes(query)
            );
        });
    }, [customerData.projects, searchQuery]);

    // Fungsi untuk meng-handle "Pilih Semua"
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedProjectIds(filteredProjects.map(p => p.id));
        } else {
            setSelectedProjectIds([]);
        }
    };

    // Fungsi untuk meng-handle "Pilih Satu"
    const handleSelectProject = (projectId: string, checked: boolean) => {
        if (checked) {
            setSelectedProjectIds(prev => [...prev, projectId]);
        } else {
            setSelectedProjectIds(prev => prev.filter(id => id !== projectId));
        }
    };
    
    // --- FUNGSI UNDUH EXCEL (DIPERBARUI DENGAN SORTING) ---
    const handleDownload = () => {
        if (selectedProjectIds.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Gagal Mengunduh',
                description: 'Harap pilih minimal satu proyek untuk diunduh.',
            });
            return;
        }

        startDownloadTransition(() => {
            // 1. Filter data
            const projectsToExport = customerData.projects
                .filter(p => selectedProjectIds.includes(p.id))
                // --- INI DIA PERUBAHANNYA ---
                // Urutkan dari tanggal terlama (a) ke terbaru (b)
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            
            const paymentsToExport = allCustomerPayments.filter(p => selectedProjectIds.includes(p.project_id || ''));
            const handlerMap = new Map(allHandlers.map(h => [h.id, h.name]));

            // 2. Buat data untuk Sheet "Detail Proyek" (Format Array of Arrays)
            const detailsAOA = [
                // Baris Header
                ['Proyek', ...projectsToExport.map((p, i) => `Proyek ${i + 1}`)],
                // Baris Data
                ['Informasi', ...projectsToExport.map(p => p.project_name)],
                ['ID Proyek', ...projectsToExport.map(p => p.id)],
                ['Customer ID', ...projectsToExport.map(p => p.customer_id)],
                ['Nama Customer', ...projectsToExport.map(() => customer.name)],
                ['Nama Proyek', ...projectsToExport.map(p => p.project_name)],
                ['Tanggal', ...projectsToExport.map(p => format(new Date(p.created_at), 'dd/MM/yyyy'))],
                ['Status Proyek', ...projectsToExport.map(p => p.project_status)],
                ['Status Pembayaran', ...projectsToExport.map(p => p.payment_status)],
                ['Handlers', ...projectsToExport.map(p => p.handler_ids ? p.handler_ids.map(id => handlerMap.get(id) || `ID: ${id.substring(0,6)}`).join(', ') : 'N/A')],
                ['Kategori', ...projectsToExport.map(p => p.category || '-')],
                ['Material', ...projectsToExport.map(p => p.material || '-')],
                ['Ukuran', ...projectsToExport.map(p => p.size || '-')],
                ['Panjang (cm)', ...projectsToExport.map(p => p.length || 0)],
                ['Lebar (cm)', ...projectsToExport.map(p => p.width || 0)],
                ['Form', ...projectsToExport.map(p => p.form || '-')],
                ['Berat (kg)', ...projectsToExport.map(p => p.weight || 0)],
                ['Harga Satuan', ...projectsToExport.map(p => formatCurrency(p.unit_price))],
                ['Kuantitas', ...projectsToExport.map(p => p.quantity)],
                ['Diskon', ...projectsToExport.map(p => formatCurrency(p.discount || 0))],
                ['Total Harga', ...projectsToExport.map(p => formatCurrency(p.total_price))],
                ['DP', ...projectsToExport.map(p => formatCurrency(p.down_payment || 0))],
                ['Sisa Bayar (Proyek)', ...projectsToExport.map(p => formatCurrency(p.remaining_payment))],
                ['Detail', ...projectsToExport.map(p => p.project_details || '-')]
            ];


            // 3. Buat data untuk Sheet "Ringkasan" (Format Vertikal)
            const selectedTotalValue = projectsToExport.reduce((sum, p) => sum + p.total_price, 0);
            const selectedTotalPaid = paymentsToExport.reduce((sum, p) => sum + p.amount_paid, 0);
            const selectedTotalRemaining = selectedTotalValue - selectedTotalPaid;

            // Dibuat sebagai Array of Arrays agar konsisten
            const summaryAOA = [
                ['Deskripsi', 'Informasi'], // Header manual
                ['Nama Pelanggan', customer.name],
                ['Total Proyek Dipilih', `${selectedProjectIds.length} proyek`],
                ['Total Nilai Proyek', formatCurrency(selectedTotalValue)],
                ['Total Terbayar', formatCurrency(selectedTotalPaid)],
                ['Total Sisa Utang', formatCurrency(selectedTotalRemaining)],
            ];
            
            // 4. Buat Excel Workbook
            const wb = XLSX.utils.book_new();
            const wsDetails = XLSX.utils.aoa_to_sheet(detailsAOA);
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryAOA);

            // 5. Atur lebar kolom
            wsSummary['!cols'] = [ { wch: 25 }, { wch: 20 } ];
            const detailsCols = [ { wch: 25 } ]; 
            projectsToExport.forEach(() => detailsCols.push({ wch: 30 })); 
            wsDetails['!cols'] = detailsCols;
            
            // 6. Tambahkan sheet ke workbook
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
            XLSX.utils.book_append_sheet(wb, wsDetails, 'Detail Proyek');

            // 7. Unduh file
            XLSX.writeFile(wb, `Rekap_${customer.name.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`);

            toast({
                title: 'Unduh Berhasil',
                description: 'Laporan rekap telah diunduh.',
            });
        });
    };

    // --- Tampilan JSX (Tidak ada perubahan di sini) ---
    return (
        <div className="space-y-4">
            {/* Tombol Kembali dan Judul */}
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-xl font-bold font-headline">Detail Riwayat Pelanggan</h2>
                    <p className="text-sm text-muted-foreground">Rincian lengkap untuk {customer.name}.</p>
                </div>
            </div>

            {/* Bagian Header (Info, Stats, Tombol) */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card shadow-sm">
                {/* Info Pelanggan */}
                <div>
                    <h2 className="text-2xl font-bold font-headline">{customer.name}</h2>
                    <p className="text-sm text-muted-foreground">{customer.contact_information || 'Tidak ada info kontak'}</p>
                </div>
                {/* Stats */}
                <div className="flex-shrink-0 flex gap-2">
                    <StatBox 
                        title="Total Sisa Utang" 
                        value={formatCurrency(customerData.totalRemaining)}
                        variant={customerData.totalRemaining > 0 ? 'destructive' : 'default'}
                    />
                    <StatBox 
                        title="Total Terbayar" 
                        value={formatCurrency(customerData.totalPaid)}
                        variant={customerData.totalPaid > 0 ? 'success' : 'default'}
                    />
                    <StatBox 
                        title="Total Nilai Proyek" 
                        value={formatCurrency(customerData.totalProjectValue)}
                    />
                </div>
                {/* Tombol Unduh */}
                <Button onClick={handleDownload} disabled={isDownloading}>
                    {isDownloading ? (
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="mr-2 h-4 w-4" />
                    )}
                    {isDownloading ? 'Memproses...' : 'Unduh Rekap/Laporan'}
                </Button>
            </div>

            {/* Bagian Konten (Riwayat Proyek) */}
            <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Riwayat Proyek</h3>
                
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Cari berdasarkan proyek, tanggal (dd/mm/yyyy), status, atau jumlah..." 
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Tabel Riwayat */}
                <div className="bg-muted/30 rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Proyek</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Status Pembayaran</TableHead>
                                <TableHead className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span>Set</span>
                                        <Checkbox 
                                            checked={
                                                (filteredProjects.length > 0 && selectedProjectIds.length === filteredProjects.length)
                                                ? true
                                                : (selectedProjectIds.length > 0 && selectedProjectIds.length < filteredProjects.length)
                                                ? 'indeterminate'
                                                : false
                                            }
                                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                        />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProjects.length > 0 ? (
                                filteredProjects.map(project => (
                                    <TableRow key={project.id}>
                                        <TableCell className="font-medium">{project.project_name}</TableCell>
                                        <TableCell>{format(new Date(project.created_at), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell><Badge variant={paymentStatusVariant[project.payment_status]}>{project.payment_status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Checkbox 
                                                checked={selectedProjectIds.includes(project.id)}
                                                onCheckedChange={(checked) => handleSelectProject(project.id, !!checked)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(project.total_price)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        {searchQuery ? 'Proyek tidak ditemukan.' : 'Belum ada proyek.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}