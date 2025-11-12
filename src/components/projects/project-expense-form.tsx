
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import { LoaderCircle, PlusCircle, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addMultipleExpenses, getDropdownData } from '@/lib/data-service';
import type { Project, Partner } from '@/lib/types';
import React, { useState, useEffect } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const expenseItemSchema = z.object({
  partner_id: z.string({ required_error: 'Pilih mitra.' }),
  total_expense_amount: z.coerce.number().min(1, 'Jumlah harus lebih dari 0.'),
  description: z.string().min(1, 'Deskripsi tidak boleh kosong.'),
  created_at: z.date({ required_error: 'Tanggal pembayaran harus diisi.' }),
});

const projectExpenseSchema = z.object({
  expenses: z.array(expenseItemSchema).min(1, 'Minimal ada satu pencatatan biaya.'),
});

type ProjectExpenseFormValues = z.infer<typeof projectExpenseSchema>;

interface ProjectExpenseFormProps {
  setDialogOpen: (open: boolean) => void;
  project: Project;
  onFormSubmit: () => void;
}

export default function ProjectExpenseForm({ setDialogOpen, project, onFormSubmit }: ProjectExpenseFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      const partnersRes = await getDropdownData('partners');
      setPartners(partnersRes as Partner[]);
      setIsLoading(false);
    };
    fetchInitialData();
  }, []);

  const form = useForm<ProjectExpenseFormValues>({
    resolver: zodResolver(projectExpenseSchema),
    defaultValues: {
      expenses: [{ 
        partner_id: '', 
        total_expense_amount: 0, 
        description: `Biaya mitra untuk: ${project.project_name}`,
        created_at: new Date(),
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'expenses',
  });

  const onSubmit = (data: ProjectExpenseFormValues) => {
    startTransition(async () => {
      try {
        const expensesToInsert = data.expenses.map(expense => ({
          ...expense,
          payment_type_id: "N/A", // Default value as it's just a debt record
          project_id: project.id,
          created_at: expense.created_at.toISOString(),
        }));

        await addMultipleExpenses(expensesToInsert);
        
        toast({
          title: 'Biaya Mitra Berhasil Dicatat',
          description: `${data.expenses.length} item biaya telah dicatat sebagai utang.`,
        });

        onFormSubmit();
        setDialogOpen(false);
      } catch (error: any) {
        toast({
          title: 'Gagal Menyimpan Biaya',
          description: error.message,
          variant: 'destructive',
        });
      }
    });
  };

  const partnerOptions = React.useMemo(() => partners?.map(p => ({ value: p.id, label: p.name })) || [], [partners]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                {fields.length > 1 && (
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground"
                        onClick={() => remove(index)}
                    >
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                )}
              <FormField
                control={form.control}
                name={`expenses.${index}.created_at`}
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
                            disabled={isPending}
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
                name={`expenses.${index}.partner_id`}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Mitra</FormLabel>
                    <Combobox
                      options={partnerOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pilih mitra"
                      searchPlaceholder="Cari mitra..."
                      emptyPlaceholder="Mitra tidak ditemukan."
                      disabled={isLoading || isPending}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`expenses.${index}.total_expense_amount`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah Biaya (Utang)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`expenses.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi Biaya</FormLabel>
                    <FormControl>
                      <Textarea placeholder="cth: Biaya cetak spanduk" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => append({ 
              partner_id: '', 
              total_expense_amount: 0, 
              description: `Biaya mitra untuk: ${project.project_name}`, 
              created_at: new Date(),
          })}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Biaya Mitra Lain
        </Button>
        
        <div className="flex justify-end pt-4 border-t mt-4">
          <Button type="submit" disabled={isLoading || isPending}>
            {(isLoading || isPending) && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Semua Biaya
          </Button>
        </div>
      </form>
    </Form>
  );
}
