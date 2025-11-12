

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
import { Textarea } from '@/components/ui/textarea';
import { LoaderCircle, Calendar as CalendarIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Customer, Handler, Project, Category } from '@/lib/types';
import React, { useEffect, useState, useTransition } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

import { addProject, updateProject, getDropdownData, addCustomer, addCustomerPayment } from '@/lib/data-service';


const projectSchema = z.object({
  created_at: z.date({ required_error: 'Tanggal proyek harus diisi.' }),
  project_name: z.string().min(3, 'Nama proyek harus minimal 3 karakter.'),
  customer_id: z.string({ required_error: 'Silakan pilih pelanggan.' }),
  handler_ids: z.array(z.string()).min(1, 'Pilih minimal satu petugas.'),
  
  project_details: z.string().optional(),
  category: z.string({ required_error: 'Silakan pilih kategori.' }),
  quantity: z.coerce.number().positive('Kuantitas harus angka positif.'),
  form: z.string().optional(),
  length: z.coerce.number().optional(),
  width: z.coerce.number().optional(),
  material: z.string().optional(),
  weight: z.coerce.number().optional(),
  size: z.string().optional(),

  unit_price: z.coerce.number().min(0, 'Harga harus angka positif.'),
  discount: z.coerce.number().min(0, 'Diskon harus angka positif.').optional(),
  total_price: z.coerce.number(),
  down_payment: z.coerce.number().min(0, 'Uang muka harus angka positif.').optional(),
  remaining_payment: z.coerce.number(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  setDialogOpen: (open: boolean) => void;
  projectData?: Project | null;
  onSuccess: (project: Project) => void;
}

export default function ProjectForm({ setDialogOpen, projectData, onSuccess }: ProjectFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [handlers, setHandlers] = useState<Handler[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDropdownData = async () => {
      setIsLoading(true);
      try {
        const [customersRes, handlersRes, categoriesRes] = await Promise.all([
          getDropdownData('customers'),
          getDropdownData('handlers'),
          getDropdownData('categories'),
        ]);
        setCustomers(customersRes as Customer[]);
        setHandlers(handlersRes as Handler[]);
        setCategories(categoriesRes as Category[]);
      } catch (error: any) {
         toast({ title: "Error Memuat Data", description: error.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchDropdownData();
  }, [toast]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {},
  });
  
  useEffect(() => {
    if (projectData) {
      form.reset({
        ...projectData,
        handler_ids: projectData.handler_ids || [],
        created_at: new Date(projectData.created_at),
        project_details: projectData.project_details || '',
      });
    } else {
      form.reset({
        created_at: new Date(),
        project_name: '',
        customer_id: '',
        handler_ids: [],
        project_details: '',
        category: '',
        quantity: 1,
        form: '',
        length: 0,
        width: 0,
        material: '',
        weight: 0,
        size: '',
        unit_price: 0,
        discount: 0,
        total_price: 0,
        down_payment: 0,
        remaining_payment: 0,
      });
    }
  }, [projectData, form]);

  const { watch, setValue, getValues } = form;
  const unitPrice = watch('unit_price');
  const quantity = watch('quantity');
  const discount = watch('discount');
  const totalPrice = watch('total_price');
  const downPayment = watch('down_payment');
  const handlerIds = watch('handler_ids') || [];

  useEffect(() => {
    const newTotalPrice = (unitPrice * quantity) - (discount || 0);
    setValue('total_price', newTotalPrice >= 0 ? newTotalPrice : 0);
  }, [unitPrice, quantity, discount, setValue]);

  useEffect(() => {
    const newRemainingPayment = totalPrice - (downPayment || 0);
    setValue('remaining_payment', newRemainingPayment >= 0 ? newRemainingPayment : 0);
  }, [totalPrice, downPayment, setValue]);


  const onSubmit = (data: ProjectFormValues) => {
    startTransition(async () => {
      let finalCustomerId = data.customer_id;

      try {
        const isNewCustomer = !customers.some(c => c.id === finalCustomerId || c.name === finalCustomerId);
        
        if (isNewCustomer && finalCustomerId) {
            const newCustomer = await addCustomer({ name: finalCustomerId, contact_information: '' });
            finalCustomerId = newCustomer.id;
        }
        
        const remainingPayment = data.total_price - (data.down_payment || 0);
        let paymentStatus: Project['payment_status'] = 'Belum Lunas';
        if (remainingPayment <= 0.01) { // Epsilon for float comparison
          paymentStatus = 'Lunas';
        } else if ((data.down_payment || 0) > 0) {
          paymentStatus = 'Dibayar Sebagian';
        }

        const submissionData = {
          ...data,
          customer_id: finalCustomerId,
          project_status: projectData?.project_status || 'Tertunda',
          payment_status: paymentStatus,
          remaining_payment: remainingPayment,
          created_at: data.created_at.toISOString(),
        };

        let resultProject: Project;
        if (projectData) {
          resultProject = await updateProject(projectData.id, submissionData);
        } else {
          // @ts-ignore
          resultProject = await addProject(submissionData as Omit<Project, 'id' | 'user_id'>);
          if (submissionData.down_payment && submissionData.down_payment > 0) {
              await addCustomerPayment({
                  project_id: resultProject.id,
                  payment_type_id: "Tunai", 
                  total_payment: submissionData.total_price,
                  amount_paid: submissionData.down_payment,
                  remaining_payment: submissionData.remaining_payment,
                  created_at: data.created_at.toISOString(),
                  partner_receivable_id: null,
              });
          }
        }
        
        toast({
          title: projectData ? 'Proyek Diperbarui' : 'Proyek Dibuat',
          description: `Proyek "${resultProject.project_name}" telah berhasil disimpan.`,
        });
        
        onSuccess(resultProject);
        setDialogOpen(false);
      } catch (error: any) {
         console.error("Error saving project:", error);
         toast({
            title: 'Terjadi Kesalahan',
            description: error.message || 'Tidak dapat menyimpan proyek.',
            variant: 'destructive',
         });
      }
    });
  };
  
  const customerOptions = React.useMemo(() => customers?.map(c => ({ value: c.id, label: c.name })) || [], [customers]);
  const handlerOptions = React.useMemo(() => handlers?.map(h => ({ value: h.id, label: h.name })) || [], [handlers]);
  const categoryOptions = React.useMemo(() => categories?.map(c => ({ value: c.name, label: c.name })) || [], [categories]);
  
  const handleHandlerSelect = (handlerId: string) => {
    if (handlerId && !handlerIds.includes(handlerId)) {
        setValue('handler_ids', [...handlerIds, handlerId]);
    }
  };

  const handleHandlerRemove = (handlerId: string) => {
    setValue('handler_ids', handlerIds.filter(id => id !== handlerId));
  };

  const getHandlerName = (id: string) => handlers.find(h => h.id === id)?.name || id;

  const isSubmitting = isLoading || isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-2">
        <FormField
          control={form.control}
          name="created_at"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tanggal Proyek</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isSubmitting}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="project_name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nama Proyek</FormLabel>
                <FormControl>
                    <Input placeholder="cth: Cetak Brosur" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Pelanggan</FormLabel>
                   <Combobox
                    options={customerOptions}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      const existing = customers.find(c => c.id === value);
                      if (existing) {
                        setCustomers(prev => prev.filter(c => c.id === value || !c.id.startsWith('temp-new-')));
                      }
                    }}
                    placeholder="Pilih atau tambah pelanggan"
                    searchPlaceholder="Cari atau tambah pelanggan..."
                    emptyPlaceholder="Tidak ada pelanggan."
                    disabled={isSubmitting}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        
         <FormField
            control={form.control}
            name="handler_ids"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Petugas</FormLabel>
                    <Combobox 
                        options={handlerOptions.filter(h => !handlerIds.includes(h.value))}
                        value={''}
                        onChange={handleHandlerSelect}
                        placeholder="Tambah petugas..."
                        searchPlaceholder="Cari petugas..."
                        emptyPlaceholder="Petugas tidak ditemukan."
                        disabled={isSubmitting}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                        {handlerIds.map(id => (
                            <Badge key={id} variant="secondary" className="flex items-center gap-1">
                                {getHandlerName(id)}
                                <button type="button" onClick={() => handleHandlerRemove(id)} className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />
        
        <FormField
            control={form.control}
            name="project_details"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Detail Proyek (Opsional)</FormLabel>
                <FormControl>
                    <Textarea placeholder="Jelaskan proyek..." {...field} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Kategori</FormLabel>
                      <Combobox
                        options={categoryOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Pilih kategori"
                        searchPlaceholder="Cari kategori..."
                        emptyPlaceholder="Kategori tidak ditemukan."
                        disabled={isSubmitting}
                      />
                      <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Kuantitas</FormLabel>
                    <FormControl>
                        <Input 
                        type="number"
                        placeholder="1" 
                        step="any"
                        {...field} 
                        disabled={isSubmitting}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Ukuran (Opsional)</FormLabel>
                    <FormControl>
                        <Input placeholder="cth: A4" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField
                control={form.control}
                name="form"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Bentuk (Opsional)</FormLabel>
                    <FormControl>
                        <Input placeholder="cth: Gulungan" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="length"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Panjang (cm, Ops.)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Lebar (cm, Ops.)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Berat (gr, Ops.)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
         <FormField
            control={form.control}
            name="material"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Bahan (Opsional)</FormLabel>
                <FormControl>
                    <Input placeholder="cth: Flexi" {...field} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Harga Satuan</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Diskon (Opsional)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="total_price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Total Harga</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} readOnly className="bg-muted" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="down_payment"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Uang Muka (Opsional)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
         <FormField
            control={form.control}
            name="remaining_payment"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Sisa Pembayaran</FormLabel>
                <FormControl>
                    <Input type="number" {...field} readOnly className="bg-muted" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />


        <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                {projectData ? 'Simpan Perubahan' : 'Buat Proyek'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
