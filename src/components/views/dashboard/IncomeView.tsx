/* eslint-disable max-len */
'use client';

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
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
// Import tipe tambahan yang kita perlukan untuk lookup
import type { CustomerPayment, PartnerReceivablePayment, PaymentType, Project, PartnerReceivable, Customer, Partner } from '@/lib/types';
import { LoaderCircle, Trash2, MoreHorizontal, Search } from 'lucide-react';
import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Import fungsi tambahan untuk mengambil data deskripsi
import { 
    getCustomerPayments, 
    getPartnerReceivablePayments, 
    getDropdownData, 
    deleteDropdownData, 
    getProjects, 
    getPartnerReceivables,
    getCustomers // <-- TAMBAHKAN INI
} from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

// Helper untuk format mata uang
const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

// Tipe internal untuk standarisasi data pemasukan
interface IncomeItem {
  id: string;                 // ID unik untuk React key (dibuat dari tipe + original_id)
  original_id: string;        // ID asli dari database (untuk proses hapus)
  created_at: string;
  payment_type_id: string;
  amount: number;
  sourceName: string; // <-- TAMBAHKAN INI (Nama Pelanggan/Mitra)
  description: string;
  type: 'customer' | 'partner'; // Tipe untuk membedakan sumber data saat menghapus
}

export default function IncomeView() {
    const { toast } = useToast();
    const [incomeHistory, setIncomeHistory] = useState<IncomeItem[] | null>(null);
    const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, startDeleteTransition] = useTransition();
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Ambil semua data yang diperlukan secara paralel
            const [
                customerPayments, 
                partnerPayments, 
                paymentTypeData, 
                projects, 
                partnerReceivables,
                customers, // <-- TAMBAHKAN INI
                partners // <-- TAMBAHKAN INI
            ] = await Promise.all([
                getCustomerPayments(),
                getPartnerReceivablePayments(),
                getDropdownData('payment_types'),
                getProjects(),
                getPartnerReceivables(),
                getCustomers(), // <-- TAMBAHKAN INI
                getDropdownData('partners') as Promise<Partner[]> // <-- TAMBAHKAN INI
            ]);

            // Buat Peta (Map) untuk lookup deskripsi DAN ID sumber
            const projectMap = new Map(projects.map((p: Project) => [p.id, { name: p.project_name, customerId: p.customer_id }]));
            const receivableMap = new Map(partnerReceivables.map((r: PartnerReceivable) => [r.id, { description: r.description, partnerId: r.partner_id }]));
            
            // Buat Peta (Map) untuk nama Pelanggan dan Mitra
            const customerMap = new Map(customers.map((c: Customer) => [c.id, c.name]));
            const partnerMap = new Map(partners.map((p: Partner) => [p.id, p.name]));


            // Standarisasi data dari customer_payments
            const standardizedCustomerPayments: IncomeItem[] = customerPayments.map((p: CustomerPayment) => {
                const projectInfo = p.project_id ? projectMap.get(p.project_id) : null;
                const customerName = projectInfo ? customerMap.get(projectInfo.customerId) : null;

                return {
                    id: `cust-${p.id}`,
                    original_id: p.id,
                    created_at: p.created_at,
                    payment_type_id: p.payment_type_id,
                    amount: p.amount_paid,
                    sourceName: customerName || (projectInfo ? 'Pelanggan Proyek' : 'Pelanggan Umum'), // <-- TAMBAHKAN INI
                    description: projectInfo ? projectInfo.name : 'Pembayaran Lain-lain',
                    type: 'customer',
                };
            });

            // Standarisasi data dari partner_receivable_payments
            const standardizedPartnerPayments: IncomeItem[] = partnerPayments.map((p: PartnerReceivablePayment) => {
                const receivableInfo = receivableMap.get(p.partner_receivable_id);
                const partnerName = receivableInfo ? partnerMap.get(receivableInfo.partnerId) : null;

                return {
                    id: `part-${p.id}`,
                    original_id: p.id,
                    created_at: p.created_at,
                    payment_type_id: p.payment_type_id,
                    amount: p.amount_paid,
                    sourceName: partnerName || 'Mitra', // <-- TAMBAHKAN INI
                    description: receivableInfo ? receivableInfo.description : `Pembayaran Piutang`,
                    type: 'partner',
                };
            });

            // Gabungkan kedua sumber data dan urutkan berdasarkan tanggal
            const allIncome = [...standardizedCustomerPayments, ...standardizedPartnerPayments];
            allIncome.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            setIncomeHistory(allIncome);
            setPaymentTypes(paymentTypeData as PaymentType[]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
            toast({ variant: 'destructive', title: 'Error memuat data', description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getPaymentTypeName = (id: string) => {
        return paymentTypes.find(pt => pt.id === id)?.name || id;
    }
    
    const handleDelete = (item: IncomeItem) => {
        startDeleteTransition(async () => {
            try {
                // Gunakan fungsi deleteDropdownData yang generik
                if (item.type === 'customer') {
                    await deleteDropdownData('customer_payments', item.original_id);
                } else {
                    await deleteDropdownData('partner_receivable_payments', item.original_id);
                }
                toast({ title: 'Sukses', description: 'Catatan pemasukan berhasil dihapus.' });
                fetchData(); // Muat ulang data
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
                toast({ variant: 'destructive', title: 'Error saat menghapus', description: errorMessage });
            }
        });
    }

    // Filter pemasukan berdasarkan query pencarian
    const filteredIncome = incomeHistory?.filter(item => {
        const searchLower = searchQuery.toLowerCase();
        const paymentTypeName = getPaymentTypeName(item.payment_type_id).toLowerCase();
        return (
            item.description.toLowerCase().includes(searchLower) ||
            item.sourceName.toLowerCase().includes(searchLower) || // <-- TAMBAHKAN INI
            paymentTypeName.includes(searchLower) ||
            item.id.toLowerCase().includes(searchLower)
        );
    });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="font-headline">Pemasukan Kas</CardTitle>
          <CardDescription>Menampilkan semua riwayat pemasukan kas (dari pelanggan dan piutang mitra).</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari berdasarkan deskripsi, pelanggan, atau tipe pembayaran..." // <-- UPDATE INI
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Pelanggan/Mitra</TableHead> {/* <-- TAMBAHKAN INI */}
              <TableHead>Tipe Pembayaran</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead><span className="sr-only">Aksi</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center"> {/* <-- UPDATE COLSPAN KE 6 */}
                  <LoaderCircle className="mx-auto animate-spin" />
                </TableCell>
              </TableRow>
            ) : (
                filteredIncome?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(new Date(item.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-medium">{item.sourceName}</TableCell> {/* <-- TAMBAHKAN INI */}
                    <TableCell>
                      <Badge variant="secondary">{getPaymentTypeName(item.payment_type_id)}</Badge>
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(item.amount)}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" disabled={isDeleting}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data pemasukan secara permanen dari database.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                              {isDeleting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                              Ya, Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
            )}
            {!isLoading && filteredIncome?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground"> {/* <-- UPDATE COLSPAN KE 6 */}
                  {searchQuery ? 'Tidak ada pemasukan yang cocok dengan pencarian.' : 'Belum ada pemasukan yang dicatat.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}