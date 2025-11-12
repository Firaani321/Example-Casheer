
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
import type { Project, Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, LoaderCircle, Eye, Trash2, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import React, { useState, useEffect, useCallback, useTransition } from 'react';
import ProjectDetails from '@/components/projects/project-details';
import { useToast } from '@/hooks/use-toast';
import { getProjects, getCustomers, deleteProject } from '@/lib/data-service';
import { format } from 'date-fns';

const statusVariant: { [key in Project['project_status']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
    'Selesai': 'default',
    'Dikerjakan': 'secondary',
    'Tertunda': 'outline',
    'Dibatalkan': 'destructive',
}

export default function HistoryView() {
    const { toast } = useToast();
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const [projects, setProjects] = useState<Project[] | null>(null);
    const [customers, setCustomers] = useState<Customer[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, startDeleteTransition] = useTransition();
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [allProjects, allCustomers] = await Promise.all([
                getProjects(),
                getCustomers()
            ]);
            
            const finishedProjects = allProjects
                .filter(p => ['Selesai', 'Dibatalkan'].includes(p.project_status))
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setProjects(finishedProjects);
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


    const getCustomerName = (customerId: string) => customers?.find(c => c.id === customerId)?.name || customerId;

    const handleViewDetails = (project: Project) => {
        setSelectedProject(project);
        setDetailsDialogOpen(true);
    }
    
    const handleDelete = (projectId: string) => {
        startDeleteTransition(async () => {
            try {
                await deleteProject(projectId);
                toast({ title: 'Sukses', description: 'Proyek telah dihapus dari riwayat.' });
                fetchData(); // Refresh data
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
                toast({ variant: 'destructive', title: 'Error saat menghapus', description: errorMessage });
            }
        });
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
          <div>
            <CardTitle className="font-headline">Riwayat Proyek</CardTitle>
            <CardDescription>Lihat arsip semua proyek yang telah selesai atau dibatalkan.</CardDescription>
          </div>
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
                <TableHead>ID Proyek</TableHead>
                <TableHead>Nama Proyek</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Status Proyek</TableHead>
                <TableHead className="text-right">Total Harga</TableHead>
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
                      <TableCell className="font-medium">#{project.id.substring(0, 5).toUpperCase()}</TableCell>
                      <TableCell>{project.project_name}</TableCell>
                      <TableCell>{getCustomerName(project.customer_id)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[project.project_status]}>{project.project_status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(project.total_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isDeleting}>
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Buka menu</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleViewDetails(project)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Lihat Detail
                                    </DropdownMenuItem>
                                 <DropdownMenuSeparator />
                                 <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Hapus Permanen
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tindakan ini tidak dapat dibatalkan. Ini akan menghapus proyek dari riwayat secara permanen.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(project.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
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
               {!isLoading && filteredProjects?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {searchQuery ? 'Tidak ada proyek yang cocok dengan pencarian.' : 'Tidak ada riwayat proyek yang ditemukan.'}
                    </TableCell>
                </TableRow>
            )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Detail Proyek</DialogTitle>
             {selectedProject && <DialogDescription>Rincian lengkap untuk proyek &quot;{selectedProject.project_name}&quot;.</DialogDescription>}
          </DialogHeader>
          {selectedProject && <ProjectDetails project={selectedProject} customerName={getCustomerName(selectedProject.customer_id)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
