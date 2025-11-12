
'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Project, Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, LoaderCircle, PlusCircle, Trash2, Eye, Pencil, Handshake, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

import ProjectForm from '@/components/projects/project-form';
import ProjectDetails from '@/components/projects/project-details';
import { useToast } from '@/hooks/use-toast';
import ProjectExpenseForm from '@/components/projects/project-expense-form';
import { getProjects, getCustomers, updateProject, deleteProject } from '@/lib/data-service';

const paymentStatusVariant: { [key in Project['payment_status']]: 'default' | 'secondary' | 'destructive' } = {
    'Lunas': 'default',
    'Dibayar Sebagian': 'secondary',
    'Belum Lunas': 'destructive',
}

export default function ProjectsView() {
    const { toast } = useToast();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const [projects, setProjects] = useState<Project[] | null>(null);
    const [customers, setCustomers] = useState<Customer[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, startDeleteTransition] = useTransition();
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [allProjects, allCustomers] = await Promise.all([
                getProjects(),
                getCustomers()
            ]);
            
            const activeProjects = allProjects.filter(p => ['Tertunda', 'Dikerjakan'].includes(p.project_status));

            setProjects(activeProjects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
            setCustomers(allCustomers);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
            toast({ variant: 'destructive', title: 'Error memuat data', description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getCustomerName = (customerId: string) => customers?.find(c => c.id === customerId)?.name || '...';

    const handleEdit = (project: Project) => { setSelectedProject(project); setDialogOpen(true); }
    const handleAddNew = () => { setSelectedProject(null); setDialogOpen(true); }
    const handleViewDetails = (project: Project) => { setSelectedProject(project); setDetailsDialogOpen(true); }
    const handleAddExpense = (project: Project) => { setSelectedProject(project); setExpenseDialogOpen(true); }

    const handleDelete = async (projectId: string) => {
        startDeleteTransition(async () => {
            const originalProjects = projects;
            setProjects(prev => prev?.filter(p => p.id !== projectId) || null);
            
            try {
                await deleteProject(projectId);
                toast({ title: 'Sukses', description: 'Proyek telah dihapus.' });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
                toast({ variant: 'destructive', title: 'Error saat menghapus', description: errorMessage });
                setProjects(originalProjects); // Rollback UI
            }
        });
    }
    
    const handleStatusChange = async (projectId: string, newStatus: Project['project_status']) => {
        const originalProjects = projects;
        
        // Optimistic UI update
        const updatedProjects = projects?.map(p => p.id === projectId ? { ...p, project_status: newStatus } : p) || null;
        setProjects(updatedProjects?.filter(p => ['Tertunda', 'Dikerjakan'].includes(p.project_status)) || null);
        
        try {
            await updateProject(projectId, { project_status: newStatus });
            toast({ title: 'Sukses', description: 'Status proyek diperbarui.' });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
            toast({ variant: 'destructive', title: 'Error saat sinkronisasi status', description: errorMessage });
            setProjects(originalProjects); // Rollback UI
        }
    }

    const handleFormSuccess = (updatedOrNewProject: Project) => {
        loadData();
    }

    // Filter projects based on search query
    const filteredProjects = projects?.filter(project => {
        const searchLower = searchQuery.toLowerCase();
        const customerName = getCustomerName(project.customer_id).toLowerCase();
        const searchdate = format(new Date(project.created_at), 'dd/MM/yyyy').toLowerCase();
        return (
            project.project_name.toLowerCase().includes(searchLower) ||
            customerName.includes(searchLower) ||
            project.id.toLowerCase().includes(searchLower) ||
            searchdate.includes(searchLower)
        );
    });

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="font-headline">Proyek Aktif</CardTitle>
                        <CardDescription>Kelola dan lacak semua proyek yang sedang berjalan.</CardDescription>
                    </div>
                    <Button size="sm" className="gap-1" onClick={handleAddNew}>
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                            Tambah Proyek
                        </span>
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari proyek, pelanggan, atau ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Proyek</TableHead>
                                <TableHead>Pelanggan</TableHead>
                                <TableHead>Status Pembayaran</TableHead>
                                <TableHead className="text-right">Total Harga</TableHead>
                                <TableHead className="w-[150px]">Status Proyek</TableHead>
                                <TableHead className="text-center">Pengeluaran Mitra</TableHead>
                                <TableHead className="text-right">Aksi Lain</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center">
                                        <LoaderCircle className="mx-auto animate-spin" />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProjects?.map((project) => (
                                    <TableRow key={project.id}>
                                        <TableCell>{format(new Date(project.created_at), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{project.project_name}</div>
                                            <div className="hidden text-sm text-muted-foreground md:inline">
                                                #{project.id.substring(0, 5).toUpperCase()}
                                            </div>
                                        </TableCell>
                                        <TableCell>{getCustomerName(project.customer_id)}</TableCell>
                                        <TableCell>
                                            <Badge variant={paymentStatusVariant[project.payment_status]}>{project.payment_status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(project.total_price)}
                                        </TableCell>
                                        <TableCell>
                                            <Select value={project.project_status} onValueChange={(value) => handleStatusChange(project.id, value as Project['project_status'])}>
                                                <SelectTrigger className="w-full h-8">
                                                    <SelectValue placeholder="Pilih status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Tertunda">Tertunda</SelectItem>
                                                    <SelectItem value="Dikerjakan">Dikerjakan</SelectItem>
                                                    <SelectItem value="Selesai">Selesai</SelectItem>
                                                    <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="outline" size="sm" onClick={() => handleAddExpense(project)}>
                                                <Handshake className="mr-2 h-4 w-4" />
                                                Input
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Buka menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Aksi Lain</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleViewDetails(project)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Lihat Detail
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEdit(project)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Ubah
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Hapus
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Tindakan ini tidak dapat dibatalkan. Ini akan menghapus proyek secara permanen.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(project.id)} disabled={isDeleting}>
                                                                    {isDeleting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                                                    Hapus
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            {!isLoading && filteredProjects?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                                        {searchQuery ? 'Tidak ada proyek yang cocok dengan pencarian.' : 'Tidak ada proyek aktif yang ditemukan.'}
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
                        <DialogTitle className="font-headline">{selectedProject ? 'Ubah Proyek' : 'Tambah Proyek Baru'}</DialogTitle>
                        <DialogDescription>
                            {selectedProject ? `Mengubah detail untuk proyek #${selectedProject.id.substring(0,5).toUpperCase()}` : 'Isi detail di bawah ini untuk membuat proyek baru.'}
                        </DialogDescription>
                    </DialogHeader>
                    <ProjectForm setDialogOpen={setDialogOpen} projectData={selectedProject} onSuccess={handleFormSuccess} />
                </DialogContent>
            </Dialog>
            
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="font-headline">Detail Proyek</DialogTitle>
                        {selectedProject && <DialogDescription>Rincian lengkap untuk proyek &quot;{selectedProject.project_name}&quot;.</DialogDescription>}
                    </DialogHeader>
                    {selectedProject && <ProjectDetails project={selectedProject} customerName={getCustomerName(selectedProject.customer_id)} />}
                </DialogContent>
            </Dialog>

            <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="font-headline">Input Pengeluaran Mitra</DialogTitle>
                        {selectedProject && <DialogDescription>Catat pengeluaran baru untuk mitra pada proyek &quot;{selectedProject.project_name}&quot;.</DialogDescription>}
                    </DialogHeader>
                    {selectedProject && <ProjectExpenseForm project={selectedProject} setDialogOpen={setExpenseDialogOpen} onFormSubmit={loadData} />}
                </DialogContent>
            </Dialog>
        </>
    );
}
