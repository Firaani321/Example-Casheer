'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { LoaderCircle, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getDropdownData, clearLocalDatabase } from '@/lib/data-service';
import { DataTable } from '@/components/settings/DataTable';

export default function SettingsView() {
  const { toast } = useToast();
  const [data, setData] = useState<{[key: string]: any[] | null}>({
    partners: null,
    paymentTypes: null,
    handlers: null,
    categories: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, startClearingTransition] = useTransition();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [partnersRes, paymentTypesRes, handlersRes, categoriesRes] = await Promise.all([
            getDropdownData('partners'),
            getDropdownData('payment_types'),
            getDropdownData('handlers'),
            getDropdownData('categories'),
        ]);

        setData({
            partners: partnersRes,
            paymentTypes: paymentTypesRes,
            handlers: handlersRes,
            categories: categoriesRes,
        });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClearData = async () => {
    startClearingTransition(async () => {
        try {
            await clearLocalDatabase(); // Now clears db.json
            toast({ title: 'Sukses', description: 'Database lokal berhasil dibersihkan.' });
            fetchData(); // Refresh data after clearing
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    });
  }


  return (
    <div className="grid gap-6">
       <Card>
        <CardHeader>
            <CardTitle className="font-headline">Pengaturan Data</CardTitle>
            <CardDescription>
                Kelola data master untuk operasional aplikasi Anda, seperti mitra, tipe pembayaran, petugas, dan kategori proyek.
            </CardDescription>
        </CardHeader>
      </Card>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DataTable title="Mitra" data={data.partners} collectionName="partners" isLoading={isLoading} onDataChange={fetchData}/>
        <DataTable title="Tipe Pembayaran" data={data.paymentTypes} collectionName="payment_types" isLoading={isLoading} onDataChange={fetchData} />
        <DataTable title="Petugas" data={data.handlers} collectionName="handlers" isLoading={isLoading} onDataChange={fetchData} />
        <DataTable title="Kategori Proyek" data={data.categories} collectionName="categories" isLoading={isLoading} onDataChange={fetchData} />
      </div>

      <Card className="border-destructive">
        <CardHeader>
            <CardTitle className="font-headline text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Zona Berbahaya
            </CardTitle>
            <CardDescription>
                Tindakan di bawah ini bersifat permanen dan tidak dapat diurungkan.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg">
                <div>
                    <h3 className="font-semibold">Bersihkan Database Lokal</h3>
                    <p className="text-sm text-muted-foreground">Menghapus semua data dari perangkat Anda untuk memulai dari awal. Data di server tidak akan terpengaruh.</p>
                </div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isClearing}>Bersihkan Data Lokal</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus semua proyek, pelanggan, pembayaran, dan data lainnya dari database lokal di browser Anda. Ini tidak dapat diurungkan.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={isClearing}>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearData} disabled={isClearing} className="bg-destructive hover:bg-destructive/90">
                           {isClearing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                           Ya, Hapus Semua Data
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
