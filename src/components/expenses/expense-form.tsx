
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
import { addExpense, getDropdownData } from '@/lib/data-service';
import type { PaymentType } from '@/lib/types';
import React, { useState, useEffect } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const expenseSchema = z.object({
  payment_type_id: z.string({ required_error: 'Pilih tipe pembayaran.' }),
  total_expense_amount: z.coerce.number().min(1, 'Jumlah harus lebih dari 0.'),
  description: z.string().min(1, 'Deskripsi tidak boleh kosong.'),
  created_at: z.date({ required_error: 'Tanggal pengeluaran harus diisi.' }),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  setDialogOpen: (open: boolean) => void;
  onFormSubmit: () => void;
}

export default function ExpenseForm({ setDialogOpen, onFormSubmit }: ExpenseFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentTypes = async () => {
      setIsLoading(true);
      const data = await getDropdownData('payment_types');
      setPaymentTypes(data as PaymentType[]);
      setIsLoading(false);
    };
    fetchPaymentTypes();
  }, []);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      payment_type_id: '',
      total_expense_amount: 0,
      description: '',
      created_at: new Date(),
    },
  });

  const onSubmit = (data: ExpenseFormValues) => {
    startTransition(async () => {
      try {
        await addExpense({
            ...data,
            created_at: data.created_at.toISOString(),
        });
        toast({
          title: 'Pengeluaran Berhasil Dicatat',
        });

        onFormSubmit();
        setDialogOpen(false);
      } catch (error: any) {
        toast({
          title: 'Gagal Menyimpan',
          description: error.message,
          variant: 'destructive',
        });
      }
    });
  };

  const paymentTypeOptions = React.useMemo(() => paymentTypes?.map(p => ({ value: p.id, label: p.name })) || [], [paymentTypes]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="created_at"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tanggal Pengeluaran</FormLabel>
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
          name="total_expense_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jumlah Pengeluaran</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} disabled={isLoading || isPending}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi</FormLabel>
              <FormControl>
                <Textarea placeholder="cth: Biaya listrik bulan ini" {...field} disabled={isLoading || isPending}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isLoading || isPending}>
            {(isLoading || isPending) && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Pengeluaran
          </Button>
        </div>
      </form>
    </Form>
  );
}
