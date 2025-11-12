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
import { Badge } from '@/components/ui/badge';
import type { Project, Customer } from '@/lib/types';
import { LoaderCircle, DollarSign, Search } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CustomerPaymentForm from '@/components/projects/customer-payment-form';
import { getProjects, getCustomers } from '@/lib/data-service';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const paymentStatusVariant: { [key in Project['payment_status']]: 'default' | 'secondary' | 'destructive' } = {
    'Lunas': 'default',
    'Dibayar Sebagian': 'secondary',
    'Belum Lunas': 'destructive',
}

export default function CustomerPaymentsPage() {
    const { toast } = useToast();
    const [projects, setProjects] = useState<Project[] | null>(null);
    const [customers, setCustomers] = useState<Customer[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [allProjects, allCustomers] = await Promise.all([
                getProjects(),
                getCustomers()
            ]);
            
            const projectsWithDebt = allProjects
                .filter(p => ['Belum Lunas', 'Dibayar Sebagian'].includes(p.payment_status))
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setProjects(projectsWithDebt);
            setCustomers(allCustomers);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error fetching data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getCustomerName = (customerId: string) => customers?.find(c => c.id === customerId)?.name || customerId;

    const handleCustomerPayment = (project: Project) => {
        setSelectedProject(project);
        setDialogOpen(true);
    }

    // Filter projects based on search query
    const filteredProjects = projects?.filter(project => {
        const searchLower = searchQuery.toLowerCase();
        const customerName = getCustomerName(project.customer_id).toLowerCase();
        return (
            project.project_name.toLowerCase().includes(searchLower) ||
            customerName.includes(searchLower) ||
            project.id.toLowerCase().includes(searchLower)
        );
    });

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Pembayaran Pelanggan</CardTitle>
        <CardDescription>Lacak dan catat pembayaran masuk dari pelanggan untuk proyek yang belum lunas.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari proyek berdasarkan nama, pelanggan, atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proyek</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Status Pembayaran</TableHead>
              <TableHead className="text-right">Total Tagihan</TableHead>
              <TableHead className="text-right">Sisa Tagihan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
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
                filteredProjects?.map((project) => (
                <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.project_name}</TableCell>
                    <TableCell>{getCustomerName(project.customer_id)}</TableCell>
                    <TableCell>
                        <Badge variant={paymentStatusVariant[project.payment_status]}>{project.payment_status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(project.total_price)}</TableCell>
                    <TableCell className="text-right text-red-600 font-semibold">{formatCurrency(project.remaining_payment)}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleCustomerPayment(project)} disabled={project.payment_status === 'Lunas'}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            Bayar
                        </Button>
                    </TableCell>
                </TableRow>
                ))
            )}
             {!isLoading && filteredProjects?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {searchQuery ? 'Tidak ada proyek yang cocok dengan pencarian.' : 'Tidak ada proyek dengan tagihan aktif.'}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
     <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Pembayaran Pelanggan</DialogTitle>             {selectedProject && <DialogDescription>Catat pembayaran dari pelanggan untuk proyek "{selectedProject.project_name}".</DialogDescription>}
          </DialogHeader>
          {selectedProject && <CustomerPaymentForm project={selectedProject} setDialogOpen={setDialogOpen} onFormSubmit={fetchData} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
