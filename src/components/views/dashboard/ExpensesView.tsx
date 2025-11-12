
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
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import type { Expense, PaymentType } from '@/lib/types';
import { LoaderCircle, PlusCircle, Trash2, MoreHorizontal, Search } from 'lucide-react';
import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ExpenseForm from '@/components/expenses/expense-form';
import { getExpenses, getDropdownData, deletePartnerPayment, deleteExpense } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const getPartnerPaymentIdFromDescription = (description: string): string | null => {
    const match = description.match(/\[payment_id:([^\]]+)\]/);
    return match ? match[1] : null;
};

export default function ExpensesView() {
    const { toast } = useToast();
    const [expenses, setExpenses] = useState<Expense[] | null>(null);
    const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isDeleting, startDeleteTransition] = useTransition();
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [expenseData, paymentTypeData] = await Promise.all([
                getExpenses(),
                getDropdownData('payment_types')
            ]);
            // Menampilkan semua pengeluaran kas riil:
            // 1. Pengeluaran umum (tanpa project_id & partner_id)
            // 2. Pembayaran ke mitra (tanpa project_id & partner_id, tapi dari alur pembayaran)
            setExpenses(expenseData.filter(e => !e.project_id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
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
    
    const handleDelete = (expense: Expense) => {
        const partnerPaymentId = getPartnerPaymentIdFromDescription(expense.description);

        startDeleteTransition(async () => {
            try {
                if (partnerPaymentId) {
                    await deletePartnerPayment(partnerPaymentId, expense.id);
                    toast({ title: 'Sukses', description: 'Pembayaran mitra berhasil dihapus.' });
                } else {
                    await deleteExpense(expense.id);
                    toast({ title: 'Sukses', description: 'Pengeluaran umum berhasil dihapus.' });
                }
                fetchData();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
                toast({ variant: 'destructive', title: 'Error saat menghapus', description: errorMessage });
            }
        });
    }

    // Filter expenses based on search query
    const filteredExpenses = expenses?.filter(expense => {
        const searchLower = searchQuery.toLowerCase();
        const cleanDescription = expense.description.replace(/ \[payment_id:[^\]]+\]/, '');
        const paymentTypeName = getPaymentTypeName(expense.payment_type_id).toLowerCase();
        return (
            cleanDescription.toLowerCase().includes(searchLower) ||
            paymentTypeName.includes(searchLower) ||
            expense.id.toLowerCase().includes(searchLower)
        );
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline">Pengeluaran Kas</CardTitle>
          <CardDescription>Catat dan pantau semua pengeluaran kas riil (umum dan pembayaran mitra).</CardDescription>
        </div>
         <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Tambah Pengeluaran Umum
                </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="font-headline">Tambah Pengeluaran Umum</DialogTitle>
                    <DialogDescription>
                        Catat pengeluaran yang tidak terkait dengan utang proyek atau mitra.
                    </DialogDescription>
                </DialogHeader>
                <ExpenseForm setDialogOpen={setDialogOpen} onFormSubmit={fetchData} />
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari pengeluaran berdasarkan deskripsi atau tipe pembayaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Tipe Pembayaran</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead><span className="sr-only">Aksi</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">
                        <LoaderCircle className="mx-auto animate-spin" />
                    </TableCell>
                </TableRow>
            ) : (
                filteredExpenses?.map((expense) => {
                    const partnerPaymentId = getPartnerPaymentIdFromDescription(expense.description);
                    const cleanDescription = expense.description.replace(/ \[payment_id:[^\]]+\]/, '');
                    return (
                        <TableRow key={expense.id}>
                            <TableCell>{format(new Date(expense.created_at), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>
                            <Badge variant="secondary">{getPaymentTypeName(expense.payment_type_id)}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{cleanDescription}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(expense.total_expense_amount)}</TableCell>
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
                                                {partnerPaymentId
                                                    ? "Tindakan ini akan menghapus catatan pembayaran mitra dan mengembalikan status utang."
                                                    : "Tindakan ini tidak dapat dibatalkan. Ini akan menghapus pengeluaran secara permanen."}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(expense)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                                {isDeleting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                                Ya, Hapus
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    )
                })
            )}
             {!isLoading && filteredExpenses?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {searchQuery ? 'Tidak ada pengeluaran yang cocok dengan pencarian.' : 'Belum ada pengeluaran yang dicatat.'}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
