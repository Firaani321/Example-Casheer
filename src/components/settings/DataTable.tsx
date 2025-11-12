'use client';
import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addDropdownData, deleteDropdownData } from '@/lib/data-service';
import type { DropdownData } from '@/lib/types';
import { LoaderCircle, MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';

type TableName = 'partners' | 'payment_types' | 'handlers' | 'categories';

export const DataTable = ({ title, data, collectionName, isLoading, onDataChange }: { title: string; data: DropdownData[] | null, collectionName: TableName, isLoading: boolean, onDataChange: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    startTransition(async () => {
        try {
            await addDropdownData(collectionName, { name: newItem });
            setNewItem('');
            setOpen(false);
            onDataChange();
            toast({ title: 'Success', description: 'Item berhasil ditambahkan.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    });
  };

  const handleDeleteItem = async (id: string) => {
    try {
        await deleteDropdownData(collectionName, id);
        toast({ title: 'Info', description: 'Item berhasil dihapus.' });
        onDataChange();
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error saat menghapus', description: error.message });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline text-lg">{title}</CardTitle>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Tambah
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah {title.slice(0, -1)} Baru</DialogTitle>
              <DialogDescription>
                Masukkan nama untuk item baru.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nama
                </Label>
                <Input
                  id="name"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  className="col-span-3"
                  disabled={isPending}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Batal</Button>
              <Button type="submit" onClick={handleAddItem} disabled={isPending}>
                {isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nilai</TableHead>
              <TableHead><span className="sr-only">Aksi</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center">
                  <LoaderCircle className="mx-auto animate-spin" />
                </TableCell>
              </TableRow>
            ) : (
              data?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                   <TableCell className="text-right">
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleDeleteItem(item.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Hapus
                          </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
