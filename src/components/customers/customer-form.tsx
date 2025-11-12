'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addCustomer } from '@/lib/data-service';
import { LoaderCircle } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';

interface CustomerFormProps {
    setDialogOpen: (open: boolean) => void;
    onFormSubmit: () => void;
}

export default function CustomerForm({ setDialogOpen, onFormSubmit }: CustomerFormProps) {
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [contactInformation, setContactInformation] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Nama pelanggan tidak boleh kosong.' });
            return;
        }

        startTransition(async () => {
            try {
                await addCustomer({ name, contact_information: contactInformation });
                onFormSubmit();
                toast({ title: 'Success', description: 'Pelanggan berhasil ditambahkan.' });
                setDialogOpen(false);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
                toast({ variant: 'destructive', title: 'Error', description: errorMessage });
            }
        });
    };

    return (
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nama</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" disabled={isPending} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contact" className="text-right">Info Kontak</Label>
                <Textarea id="contact" value={contactInformation} onChange={(e) => setContactInformation(e.target.value)} className="col-span-3" placeholder="(Opsional) cth: 08123456789" disabled={isPending} />
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>Batal</Button>
                <Button type="submit" onClick={handleSubmit} disabled={isPending}>
                    {isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan
                </Button>
            </DialogFooter>
        </div>
    );
}
