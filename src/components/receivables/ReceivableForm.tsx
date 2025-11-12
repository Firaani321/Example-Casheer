
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
import type { PartnerReceivable, Partner } from '@/lib/types';
import { LoaderCircle, PlusCircle, Calendar as CalendarIcon, MoreHorizontal, Trash2, DollarSign } from 'lucide-react';
import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getPartnerReceivables, getDropdownData, addPartnerReceivable, deletePartnerReceivable } from '@/lib/data-service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import PartnerReceivablePaymentForm from '@/components/receivables/partner-receivable-payment-form';
import { Badge } from '@/components/ui/badge';


const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

export const ReceivableForm = ({ setDialogOpen, onFormSubmit }: { setDialogOpen: (open: boolean) => void, onFormSubmit: () => void }) => {
    const { toast } = useToast();
    const [partnerId, setPartnerId] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [createdAt, setCreatedAt] = useState<Date | undefined>(new Date());
    const [partners, setPartners] = useState<Partner[] | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isPending, startTransition] = useTransition();


    useEffect(() => {
      const fetchPartners = async () => {
        setIsLoadingData(true);
        const data = await getDropdownData('partners');
        setPartners(data as Partner[]);
        setIsLoadingData(false);
      }
      fetchPartners();
    }, []);

    const partnerOptions = React.useMemo(() => partners?.map(p => ({ value: p.id, label: p.name })) || [], [partners]);

    const handleSubmit = async () => {
        if (!partnerId || !amount || !description || !createdAt) {
            toast({ variant: 'destructive', title: 'Error', description: 'Semua field harus diisi.' });
            return;
        }
        
        startTransition(async () => {
            try {
                const parsedAmount = parseFloat(amount);
                await addPartnerReceivable({
                    partner_id: partnerId,
                    amount: parsedAmount,
                    description,
                    created_at: createdAt.toISOString(),
                    remaining_amount: parsedAmount, // Ensure remaining_amount is set on creation
                    status: 'Belum Lunas'
                });

                toast({ title: 'Success', description: 'Piutang berhasil ditambahkan.' });
                onFormSubmit();
                setDialogOpen(false);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
                toast({ variant: 'destructive', title: 'Error', description: errorMessage });
            }
        });
    }

    const isLoading = isLoadingData || isPending;

    return (
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">Tanggal</Label>
                <div className="col-span-3">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !createdAt && "text-muted-foreground"
                                )}
                                disabled={isLoading}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {createdAt ? format(createdAt, 'dd/MM/yyyy') : <span>Pilih tanggal</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            mode="single"
                            selected={createdAt}
                            onSelect={setCreatedAt}
                            initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="partner" className="text-right">Mitra</Label>
                <div className="col-span-3">
                    <Combobox
                        options={partnerOptions}
                        value={partnerId}
                        onChange={setPartnerId}
                        placeholder="Pilih mitra"
                        searchPlaceholder="Cari mitra..."
                        emptyPlaceholder="Mitra tidak ditemukan."
                        disabled={isLoading}
                    />
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Jumlah</Label>
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="col-span-3" disabled={isLoading} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Deskripsi</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" disabled={isLoading} />
            </div>
            <DialogFooter>
                 <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isLoading}>Batal</Button>
                <Button onClick={handleSubmit} disabled={isLoading}>
                    {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan
                </Button>
            </DialogFooter>
        </div>
    )
}
