
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { LoaderCircle, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addPartnerPayment, addExpense, getDropdownData } from '@/lib/data-service';
import type { PaymentType } from '@/lib/types';
import React, { useState, useEffect, useMemo } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const partnerPaymentSchema = z.object({
  payment_type_id: z.string({ required_error: 'Pilih tipe pembayaran.' }),
  amount: z.coerce.number().min(1, 'Jumlah harus lebih dari 0.'),
  created_at: z.date({ required_error: 'Tanggal pembayaran harus diisi.' }),
});

type PartnerPaymentFormValues = z.infer<typeof partnerPaymentSchema>;

type PartnerDebtInfo = {
  project_id: string;
  project_name: string;
  partner_id: string;
  partner_name: string;
  remaining_debt: number;
}

interface PartnerPaymentFormProps {
  setDialogOpen: (open: boolean) => void;
  debtInfo: PartnerDebtInfo;
  onFormSubmit: () => void;
}


export default function PartnerPaymentForm({ setDialogOpen, debtInfo, onFormSubmit }: PartnerPaymentFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[] | null>(null);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      const typesData = await getDropdownData('payment_types');
      setPaymentTypes(typesData as PaymentType[]);
      setIsLoading(false);
    };
    fetchInitialData();
  }, []);

  const form = useForm<PartnerPaymentFormValues>({
    resolver: zodResolver(partnerPaymentSchema),
    defaultValues: {
      payment_type_id: '',
      amount: debtInfo.remaining_debt > 0 ? debtInfo.remaining_debt : 0,
      created_at: new Date(),
    },
  });

  const onSubmit = (data: PartnerPaymentFormValues) => {
    if(data.amount > debtInfo.remaining_debt + 0.01) { // Add tolerance for float issues
        toast({
            title: 'Jumlah Pembayaran Salah',
            description: `Pembayaran tidak boleh melebihi sisa utang ${formatCurrency(debtInfo.remaining_debt)}.`,
            variant: 'destructive',
        });
        return;
    }

    startTransition(async () => {
      try {
        // 1. Catat pembayaran untuk mengurangi utang
        const newPartnerPayment = await addPartnerPayment({
          project_id: debtInfo.project_id,
          partner_id: debtInfo.partner_id,
          amount: data.amount,
          payment_type_id: data.payment_type_id,
          description: `Pembayaran untuk ${debtInfo.project_name}`,
          created_at: data.created_at.toISOString(),
        });

        // 2. Catat sebagai pengeluaran kas riil, sembunyikan ID pembayaran mitra di deskripsi
        await addExpense({
            payment_type_id: data.payment_type_id,
            description: `Pembayaran ke Mitra: ${debtInfo.partner_name} (Proyek: ${debtInfo.project_name}) [payment_id:${newPartnerPayment.id}]`,
            total_expense_amount: data.amount,
            created_at: data.created_at.toISOString(),
        });

        toast({
          title: 'Pembayaran Mitra Berhasil',
          description: `Pembayaran sebesar ${formatCurrency(data.amount)} telah dicatat sebagai pengeluaran.`,
        });
        
        onFormSubmit();
        setDialogOpen(false);
      } catch (error: any) {
        toast({
          title: 'Gagal Menyimpan Pembayaran',
          description: error.message,
          variant: 'destructive',
        });
      }
    });
  };

  const paymentTypeOptions = useMemo(() => paymentTypes?.map(p => ({ value: p.id, label: p.name })) || [], [paymentTypes]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <div className="p-4 border rounded-md space-y-3">
             <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sisa Utang ke {debtInfo.partner_name}:</span>
                <span className="font-semibold text-red-600">{formatCurrency(debtInfo.remaining_debt)}</span>
            </div>
        </div>

        <FormField
          control={form.control}
          name="created_at"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tanggal Pembayaran</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isLoading || isPending}
                    >
                      {field.value ? (
                        format(field.value, 'dd/MM/yyyy')
                      ) : (
                        <span>Pilih tanggal</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="payment_type_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tipe Pembayaran</FormLabel>
              <Combobox
                options={paymentTypeOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Pilih tipe pembayaran"
                searchPlaceholder="Cari tipe..."
                emptyPlaceholder="Tipe tidak ditemukan."
                disabled={isLoading || isPending}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jumlah Pembayaran</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} disabled={isPending || isLoading}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end pt-4 border-t mt-4">
          <Button type="submit" disabled={isLoading || isPending}>
            {(isLoading || isPending) && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Pembayaran
          </Button>
        </div>
      </form>
    </Form>
  );
}
