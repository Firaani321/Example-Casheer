
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
import { addCustomerPayment, updateProject, getDropdownData } from '@/lib/data-service';
import type { Project, PaymentType } from '@/lib/types';
import React, { useState, useEffect } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const customerPaymentSchema = z.object({
  payment_type_id: z.string({ required_error: 'Pilih tipe pembayaran.' }),
  amount_paid: z.coerce.number().min(1, 'Jumlah harus lebih dari 0.'),
  created_at: z.date({ required_error: 'Tanggal pembayaran harus diisi.' }),
});

type CustomerPaymentFormValues = z.infer<typeof customerPaymentSchema>;

interface CustomerPaymentFormProps {
  setDialogOpen: (open: boolean) => void;
  project: Project;
  onFormSubmit: () => void;
}

export default function CustomerPaymentForm({ setDialogOpen, project, onFormSubmit }: CustomerPaymentFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[] | null>(null);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);

  useEffect(() => {
    const fetchPaymentTypes = async () => {
      setIsLoadingTypes(true);
      const data = await getDropdownData('payment_types');
      setPaymentTypes(data as PaymentType[]);
      setIsLoadingTypes(false);
    }
    fetchPaymentTypes();
  }, []);

  const form = useForm<CustomerPaymentFormValues>({
    resolver: zodResolver(customerPaymentSchema),
    defaultValues: {
      amount_paid: project.remaining_payment > 0 ? project.remaining_payment : 0,
      payment_type_id: '',
      created_at: new Date(),
    },
  });

  const onSubmit = (data: CustomerPaymentFormValues) => {
    startTransition(async () => {
      try {
        const amountPaid = data.amount_paid;
        if (amountPaid > project.remaining_payment) {
          toast({
            title: 'Pembayaran Melebihi Sisa',
            description: `Jumlah pembayaran (${formatCurrency(amountPaid)}) tidak boleh melebihi sisa tagihan (${formatCurrency(project.remaining_payment)}).`,
            variant: 'destructive',
          });
          return;
        }

        const newRemainingPayment = project.remaining_payment - amountPaid;
        let newPaymentStatus: Project['payment_status'] = 'Dibayar Sebagian';
        if (newRemainingPayment <= 0.01) { // Epsilon for float comparison
          newPaymentStatus = 'Lunas';
        }

        // 1. Add to customer_payments
        await addCustomerPayment({
          project_id: project.id,
          payment_type_id: data.payment_type_id,
          total_payment: project.total_price,
          amount_paid: amountPaid,
          remaining_payment: newRemainingPayment,
          created_at: data.created_at.toISOString(),
        });

        // 2. Update the project
        await updateProject(project.id, {
            remaining_payment: newRemainingPayment,
            payment_status: newPaymentStatus,
        });

        toast({
          title: 'Pembayaran Berhasil Dicatat',
          description: `Pembayaran sebesar ${formatCurrency(amountPaid)} telah disimpan.`,
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
  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="p-4 border rounded-md space-y-4">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Proyek:</span>
                <span className="font-medium">{formatCurrency(project.total_price)}</span>
            </div>
             <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sudah Dibayar:</span>
                <span className="font-medium text-green-600">{formatCurrency(project.total_price - project.remaining_payment)}</span>
            </div>
            <div className="flex justify-between text-lg">
                <span className="text-muted-foreground">Sisa Tagihan:</span>
                <span className="font-bold text-red-600">{formatCurrency(project.remaining_payment)}</span>
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
              <FormLabel>Jumlah Pembayaran</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isLoading || project.remaining_payment <= 0}>
            {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            {project.remaining_payment <= 0 ? 'Proyek Sudah Lunas' : 'Simpan Pembayaran'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
