
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PartnerReceivable, Partner } from '@/lib/types';
import { LoaderCircle, PlusCircle, MoreHorizontal, Trash2, DollarSign, Search } from 'lucide-react';
import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { getPartnerReceivables, getDropdownData, deletePartnerReceivable } from '@/lib/data-service';
import PartnerReceivablePaymentForm from '@/components/receivables/partner-receivable-payment-form';
import { ReceivableForm } from '@/components/receivables/ReceivableForm';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const paymentStatusVariant: { [key in PartnerReceivable['status']]: 'default' | 'destructive' } = {
    'Lunas': 'default',
    'Belum Lunas': 'destructive',
}

export default function PartnerReceivablesView() {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<PartnerReceivable | null>(null);
  const [receivables, setReceivables] = useState<PartnerReceivable[] | null>(null);
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [receivablesRes, partnersRes] = await Promise.all([
            getPartnerReceivables(),
            getDropdownData('partners'),
        ]);
        setReceivables(receivablesRes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setPartners(partnersRes as Partner[]);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
        toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const getPartnerName = (partnerId: string) => partners?.find(p => p.id === partnerId)?.name || partnerId;
  
  const handlePayment = (receivable: PartnerReceivable) => {
    setSelectedReceivable(receivable);
    setPaymentDialogOpen(true);
  }

  const handleDelete = (id: string) => {
    startDeleteTransition(async () => {
        try {
            await deletePartnerReceivable(id);
            toast({ title: 'Sukses', description: 'Catatan piutang berhasil dihapus.' });
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
            toast({ variant: 'destructive', title: 'Error saat menghapus', description: errorMessage });
        }
    });
  }

  // Filter receivables based on search query
  const filteredReceivables = receivables?.filter(receivable => {
    const searchLower = searchQuery.toLowerCase();
    const partnerName = getPartnerName(receivable.partner_id).toLowerCase();
    return (
      partnerName.includes(searchLower) ||
      receivable.description.toLowerCase().includes(searchLower) ||
      receivable.id.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline">Piutang Mitra</CardTitle>
            <CardDescription>Catat piutang (utang mitra kepada Anda) secara manual.</CardDescription>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Tambah Piutang
                    </span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Tambah Piutang Mitra Baru</DialogTitle>
                      <DialogDescription>
                          Masukkan detail piutang dari mitra.
                      </DialogDescription>
                  </DialogHeader>
                  <ReceivableForm setDialogOpen={setAddDialogOpen} onFormSubmit={fetchData}/>
              </DialogContent>
          </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari berdasarkan mitra, deskripsi, atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mitra</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sisa Tagihan</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    <LoaderCircle className="mx-auto animate-spin" />
                  </TableCell>
                </TableRow>
              ) : (
                filteredReceivables?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{getPartnerName(item.partner_id)}</TableCell>
                    <TableCell>{format(new Date(item.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                        <Badge variant={paymentStatusVariant[item.status]}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.remaining_amount ?? item.amount)}</TableCell>
                    <TableCell className="text-center">
                        <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost" disabled={isDeleting}>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handlePayment(item)} disabled={item.status === 'Lunas'}>
                                        <DollarSign className="mr-2 h-4 w-4" />
                                        Terima Pembayaran
                                    </DropdownMenuItem>
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
                                        Tindakan ini akan menghapus catatan piutang ini secara permanen.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(item.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
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
              {!isLoading && filteredReceivables?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {searchQuery ? 'Tidak ada piutang yang cocok dengan pencarian.' : 'Belum ada piutang mitra.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
     <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Terima Pembayaran dari Mitra</DialogTitle>
                {selectedReceivable && <DialogDescription>Catat pembayaran dari {getPartnerName(selectedReceivable.partner_id)}.</DialogDescription>}
            </DialogHeader>
            {selectedReceivable && <PartnerReceivablePaymentForm receivable={selectedReceivable} setDialogOpen={setPaymentDialogOpen} onFormSubmit={fetchData}/>}
        </DialogContent>
    </Dialog>
    </>
  );
}
