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
import type { Project, Customer, Expense, PartnerPayment, Partner } from '@/lib/types';
import { LoaderCircle, Handshake, MoreHorizontal, Trash2, Search } from 'lucide-react';
import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PartnerPaymentForm from '@/components/projects/partner-payment-form';
import { getProjects, getCustomers, getExpenses, getPartnerPayments, getDropdownData, deletePartnerDebt } from '@/lib/data-service';

type PartnerDebtInfo = {
  project_id: string;
  project_name: string;
  customer_id: string;
  partner_id: string;
  partner_name: string;
  remaining_debt: number;
}

export default function PartnerPaymentsView() {
  const { toast } = useToast();
  const [partnerDebts, setPartnerDebts] = useState<PartnerDebtInfo[] | null>(null);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<PartnerDebtInfo | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
      setIsLoading(true);
      try {
        const [allProjects, allCustomers, allExpenses, allPartnerPayments, allPartners] = await Promise.all([
            getProjects(),
            getCustomers(),
            getExpenses(),
            getPartnerPayments(),
            getDropdownData('partners'),
        ]);

        const debtMap: { [key: string]: PartnerDebtInfo } = {};

        allExpenses.forEach(expense => {
          if (!expense.project_id || !expense.partner_id) return;
          
          const key = `${expense.project_id}-${expense.partner_id}`;
          const project = allProjects.find(p => p.id === expense.project_id);
          
          if (!project) return;
          
          if (!debtMap[key]) {
             const partner = (allPartners as Partner[]).find(p => p.id === expense.partner_id);
             debtMap[key] = {
                project_id: project.id,
                project_name: project.project_name,
                customer_id: project.customer_id,
                partner_id: expense.partner_id,
                partner_name: partner?.name || 'Unknown',
                remaining_debt: 0,
             };
          }
          debtMap[key].remaining_debt += expense.total_expense_amount;
        });

        allPartnerPayments.forEach(payment => {
            const key = `${payment.project_id}-${payment.partner_id}`;
            if(debtMap[key]) {
                debtMap[key].remaining_debt -= payment.amount;
            }
        });
        
        const debtsToDisplay = Object.values(debtMap)
            .filter(d => d.remaining_debt > 0.01) // Use a small epsilon for float comparison
            .sort((a, b) => a.project_name.localeCompare(b.project_name));

        setPartnerDebts(debtsToDisplay);
        setCustomers(allCustomers);
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
          toast({ variant: 'destructive', title: 'Error fetching data', description: errorMessage });
      } finally {
        setIsLoading(false);
      }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePartnerPayment = (debt: PartnerDebtInfo) => {
    setSelectedDebt(debt);
    setDialogOpen(true);
  };

  const handleDeleteDebt = (debt: PartnerDebtInfo) => {
    startDeleteTransition(async () => {
        try {
            await deletePartnerDebt(debt.project_id, debt.partner_id);
            toast({ title: 'Sukses', description: `Semua utang untuk ${debt.partner_name} di proyek ${debt.project_name} telah dihapus.` });
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
            toast({ variant: 'destructive', title: 'Error saat menghapus', description: errorMessage });
        }
    });
  }

  const getCustomerName = (customerId: string) => customers?.find(c => c.id === customerId)?.name || '...';
  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  // Filter debts based on search query
  const filteredDebts = partnerDebts?.filter(debt => {
    const searchLower = searchQuery.toLowerCase();
    const customerName = getCustomerName(debt.customer_id).toLowerCase();
    return (
      debt.project_name.toLowerCase().includes(searchLower) ||
      debt.partner_name.toLowerCase().includes(searchLower) ||
      customerName.includes(searchLower) ||
      debt.project_id.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Pembayaran Mitra</CardTitle>
          <CardDescription>Catat pembayaran ke mitra untuk proyek yang memiliki utang.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="mb-4 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari berdasarkan proyek, mitra, pelanggan, atau ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Mitra</TableHead>
                  <TableHead>Pelanggan</TableHead>
                   <TableHead className="text-right">Sisa Utang</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
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
                  filteredDebts?.map((debt) => (
                    <TableRow key={`${debt.project_id}-${debt.partner_id}`}>
                      <TableCell>
                        <div className="font-medium">{debt.project_name}</div>
                        <div className="hidden text-sm text-muted-foreground md:inline">
                          #{debt.project_id.substring(0, 5).toUpperCase()}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{debt.partner_name}</TableCell>
                      <TableCell>{getCustomerName(debt.customer_id)}</TableCell>
                       <TableCell className="text-right font-semibold text-red-600">{formatCurrency(debt.remaining_debt)}</TableCell>
                      <TableCell className="text-center">
                        <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isDeleting}>
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Buka menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handlePartnerPayment(debt)}>
                                        <Handshake className="mr-2 h-4 w-4" />
                                        Bayar ke Mitra
                                    </DropdownMenuItem>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Hapus Utang
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tindakan ini akan menghapus semua catatan utang dan pembayaran untuk mitra ini pada proyek ini. Ini tidak dapat dibatalkan.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteDebt(debt)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                        {isDeleting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                        Ya, Hapus Semua
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                 {!isLoading && filteredDebts?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                            {searchQuery ? 'Tidak ada utang yang cocok dengan pencarian.' : 'Tidak ada utang mitra yang perlu dibayar.'}
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Pembayaran Mitra</DialogTitle>
             {selectedDebt && <DialogDescription>Catat pembayaran ke {selectedDebt.partner_name} untuk proyek &quot;{selectedDebt.project_name}&quot;.</DialogDescription>}
          </DialogHeader>
          {selectedDebt && <PartnerPaymentForm debtInfo={selectedDebt} setDialogOpen={setDialogOpen} onFormSubmit={fetchData} />}
        </DialogContent>
      </Dialog>
    </>
  );
}