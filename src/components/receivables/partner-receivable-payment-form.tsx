
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
import { updatePartnerReceivable, getDropdownData, addPartnerReceivablePayment } from '@/lib/data-service';
import type { PartnerReceivable, PaymentType } from '@/lib/types';
import React, { useState, useEffect } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const paymentSchema = z.object({
  payment_type_id: z.string({ required_error: 'Pilih tipe pembayaran.' }),
  amount_paid: z.coerce.number().min(1, 'Jumlah harus lebih dari 0.'),
  created_at: z.date({ required_error: 'Tanggal pembayaran harus diisi.' }),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PartnerReceivablePaymentFormProps {
  setDialogOpen: (open: boolean) => void;
  receivable: PartnerReceivable;
  onFormSubmit: () => void;
}

export default function PartnerReceivablePaymentForm({ setDialogOpen, receivable, onFormSubmit }: PartnerReceivablePaymentFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[] | null>(null);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);

  const currentRemainingAmount = receivable.remaining_amount ?? receivable.amount;

  useEffect(() => {
    const fetchPaymentTypes = async () => {
      setIsLoadingTypes(true);
      const data = await getDropdownData('payment_types');
      setPaymentTypes(data as PaymentType[]);
      setIsLoadingTypes(false);
    }
    fetchPaymentTypes();
  }, []);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount_paid: currentRemainingAmount > 0 ? currentRemainingAmount : 0,
      payment_type_id: '',
      created_at: new Date(),
    },
  });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const onSubmit = (data: PaymentFormValues) => {
    startTransition(async () => {
      try {
        const remainingAmount = currentRemainingAmount;
        const amountPaid = data.amount_paid;

        if (amountPaid > remainingAmount + 0.01) { // Epsilon for float
          toast({
            title: 'Pembayaran Melebihi Sisa',
            description: `Jumlah pembayaran (${formatCurrency(amountPaid)}) tidak boleh melebihi sisa tagihan (${formatCurrency(remainingAmount)}).`,
            variant: 'destructive',
          });
          return;
        }

        const newRemainingAmount = remainingAmount - amountPaid;
        const newStatus: PartnerReceivable['status'] = newRemainingAmount <= 0.01 ? 'Lunas' : 'Belum Lunas';

        // 1. Record the payment in the new dedicated table
        await addPartnerReceivablePayment({
          partner_receivable_id: receivable.id,
          payment_type_id: data.payment_type_id,
          amount_paid: amountPaid,
          created_at: data.created_at.toISOString(),
        });

        // 2. Update the partner receivable record
        await updatePartnerReceivable(receivable.id, {
            remaining_amount: newRemainingAmount,
            status: newStatus,
        });

        toast({
          title: 'Pembayaran Berhasil Dicatat',
          description: `Pembayaran sebesar ${formatCurrency(amountPaid)} telah disimpan sebagai uang masuk.`,
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

  const isLoading = isLoadingTypes || isPending;
  const paymentTypeOptions = React.useMemo(() => paymentTypes?.map(p => ({ value: p.id, label: p.name })) || [], [paymentTypes]);
  
  const alreadyPaid = receivable.amount - currentRemainingAmount;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="p-4 border rounded-md space-y-4">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Piutang:</span>
                <span className="font-medium">{formatCurrency(receivable.amount)}</span>
            </div>
             <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sudah Dibayar:</span>
                <span className="font-medium text-green-600">{formatCurrency(alreadyPaid)}</span>
            </div>
            <div className="flex justify-between text-lg">
                <span className="text-muted-foreground">Sisa Tagihan:</span>
                <span className="font-bold text-red-600">{formatCurrency(currentRemainingAmount)}</span>
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
                      disabled={isLoading}
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
                disabled={isLoading}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount_paid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jumlah Pembayaran Diterima</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isLoading || currentRemainingAmount <= 0}>
            {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            {currentRemainingAmount <= 0 ? 'Piutang Sudah Lunas' : 'Simpan Pembayaran'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
