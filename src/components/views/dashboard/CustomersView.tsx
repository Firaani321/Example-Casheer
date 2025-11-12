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
// --- TAMBAHKAN TIPE HANDLER ---
import type { Customer, Project, CustomerPayment, Handler } from '@/lib/types'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoaderCircle, MoreHorizontal, PlusCircle, Trash2, Search, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
// --- TAMBAHKAN getDropdownData ---
import { getCustomers, deleteCustomer, getProjects, getCustomerPayments, getDropdownData } from '@/lib/data-service';
import CustomerForm from '@/components/customers/customer-form'; 
import CustomerDetails from '@/components/customers/customer-details';
import { format } from 'date-fns';

export default function CustomersView() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[] | null>(null);
  const [handlers, setHandlers] = useState<Handler[] | null>(null); // <-- STATE BARU

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  // --- HAPUS STATE DIALOG DETAIL ---
  // const [detailsDialogOpen, setDetailsDialogOpen] = useState(false); 
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        // --- FETCH DATA DIPERBARUI ---
        const [customersData, projectsData, paymentsData, handlersData] = await Promise.all([
          getCustomers(),
          getProjects(),
          getCustomerPayments(),
          getDropdownData('handlers') as Promise<Handler[]> // <-- Ambil Handlers
        ]);
        setCustomers(customersData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setProjects(projectsData);
        setCustomerPayments(paymentsData);
        setHandlers(handlersData); // <-- Simpan Handlers
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
        toast({ variant: 'destructive', title: 'Gagal mengambil data', description: errorMessage });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleFormSubmit = () => {
    fetchData(); 
  }

  // --- HANDLER DETAIL DIPERBARUI ---
  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    // setDetailsDialogOpen(true); // <-- Hapus ini
  }
  
  // --- HANDLER BARU UNTUK KEMBALI ---
  const handleBackToList = () => {
    setSelectedCustomer(null);
  }

  const handleDeleteItem = async (id: string) => {
    startDeleteTransition(async () => {
        const originalCustomers = customers;
        setCustomers(prev => prev?.filter(c => c.id !== id) || null);
        
        try {
            await deleteCustomer(id);
            toast({ title: 'Info', description: 'Pelanggan berhasil dihapus.' });
        } catch(e) {
            const errorMessage = e instanceof Error ? e.message : 'Terjadi kesalahan tidak dikenal.';
            toast({variant: 'destructive', title: 'Error menghapus data', description: errorMessage});
            setCustomers(originalCustomers); // Rollback
        }
    });
  }; 

  const filteredCustomers = customers?.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      (customer.contact_information || '').toLowerCase().includes(searchLower) ||
      customer.id.toLowerCase().includes(searchLower)
    );
  }) || [];

  // --- LOGIKA RENDER DIPERBARUI TOTAL ---

  // Tampilkan loading jika data inti belum siap
  if (isLoading || !customers || !projects || !customerPayments || !handlers) {
    return (
        <div className="flex h-96 w-full items-center justify-center">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin" />
        </div>
    );
  }

  // Jika pelanggan DIPILIH, tampilkan Halaman Detail
  if (selectedCustomer) {
    return (
        <CustomerDetails
            customer={selectedCustomer}
            allProjects={projects}
            allCustomerPayments={customerPayments}
            allHandlers={handlers} // <-- Prop baru diteruskan
            onBack={handleBackToList}   // <-- Prop baru diteruskan
        />
    );
  }

  // Jika TIDAK ADA pelanggan dipilih, tampilkan Daftar Pelanggan (default)
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline">Pelanggan</CardTitle>
            <CardDescription>Kelola semua data pelanggan Anda di satu tempat.</CardDescription>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Tambah Pelanggan</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
                <DialogDescription>Masukkan detail untuk pelanggan baru.</DialogDescription>
              </DialogHeader>
              <CustomerForm setDialogOpen={setAddDialogOpen} onFormSubmit={handleFormSubmit} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari pelanggan berdasarkan nama, kontak, atau ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Info Kontak</TableHead>
                <TableHead>Tanggal Ditambahkan</TableHead>
                <TableHead className="text-right"><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Logika loading dipindah ke atas */}
              {filteredCustomers.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.contact_information || '-'}</TableCell>
                  <TableCell>{format(new Date(item.created_at), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" disabled={isDeleting}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                           {/* handleViewDetails sekarang hanya mengatur state, bukan membuka dialog */}
                          <DropdownMenuItem onClick={() => handleViewDetails(item)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Lihat Detail
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
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
                            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus pelanggan secara permanen.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteItem(item.id)} disabled={isDeleting}>
                            {isDeleting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Ya, Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {searchQuery ? 'Tidak ada pelanggan yang cocok dengan pencarian.' : 'Belum ada pelanggan.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- DIALOG UNTUK DETAIL SEKARANG DIHAPUS --- */}
      {/* <Dialog open={detailsDialogOpen} ... > ... </Dialog> */}
    </>
  );
}