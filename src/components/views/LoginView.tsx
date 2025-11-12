'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';

// Fungsi autentikasi placeholder
// Di aplikasi nyata, ini akan memanggil API backend Anda
const fakeAuth = async (email: string, password: string): Promise<boolean> => {
    if (email && password) {
        // Simulasikan penundaan jaringan
        await new Promise(resolve => setTimeout(resolve, 500));
        // Di sini Anda akan memvalidasi dengan backend. Untuk saat ini, login apa pun berhasil.
        return true;
    }
    return false;
};

interface LoginViewProps {
    onLoginSuccess: () => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleLogin = async () => {
        if (!email || !password) {
            toast({
                variant: "destructive",
                title: "Gagal Login",
                description: "Silakan masukkan email dan kata sandi.",
            });
            return;
        }

        setIsLoading(true);
        try {
            const success = await fakeAuth(email, password);
            if (success) {
                toast({
                    title: "Login Berhasil",
                    description: "Selamat datang kembali!",
                });
                onLoginSuccess(); // Panggil callback untuk mengubah tampilan
            } else {
                throw new Error('Email atau kata sandi tidak valid.');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
            toast({
                variant: "destructive",
                title: "Gagal Login",
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">MULTIPRINT</CardTitle>
                    <CardDescription>Masukkan kredensial Anda untuk mengakses dasbor</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            placeholder="nama@contoh.com" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input 
                            id="password" 
                            type="password" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? 'Memuat...' : 'Masuk'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
