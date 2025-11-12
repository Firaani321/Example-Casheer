
'use client';

import { Project } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { format } from 'date-fns';

interface ProjectDetailsProps {
  project: Project;
  customerName: string;
}

const DetailItem = ({ label, value }: { label: string; value: string | number | undefined | null }) => (
  <div className="flex justify-between">
    <p className="text-muted-foreground">{label}</p>
    <p className="font-medium text-right">{value || '-'}</p>
  </div>
);

const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

const statusVariant: { [key in Project['project_status']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
    'Selesai': 'default',
    'Dikerjakan': 'secondary',
    'Tertunda': 'outline',
    'Dibatalkan': 'destructive',
}

const paymentStatusVariant: { [key in Project['payment_status']]: 'default' | 'secondary' | 'destructive' } = {
    'Lunas': 'default',
    'Dibayar Sebagian': 'secondary',
    'Belum Lunas': 'destructive',
}


export default function ProjectDetails({ project, customerName }: ProjectDetailsProps) {
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
      <div className="space-y-2 rounded-lg border bg-card text-card-foreground shadow-sm p-4">
          <DetailItem label="Tanggal Dibuat" value={format(new Date(project.created_at), 'dd/MM/yyyy')} />
          <DetailItem label="Nama Proyek" value={project.project_name} />
          <DetailItem label="Pelanggan" value={customerName} />
           <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Status Proyek</p>
            <Badge variant={statusVariant[project.project_status]}>{project.project_status}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Status Pembayaran</p>
            <Badge variant={paymentStatusVariant[project.payment_status]}>{project.payment_status}</Badge>
          </div>
          {project.project_details && (
              <>
                <Separator />
                <div className="flex flex-col space-y-1 pt-2">
                    <p className="text-muted-foreground">Detail Proyek</p>
                    <p className="font-medium text-sm">{project.project_details}</p>
                </div>
              </>
          )}
      </div>
      
      <div className="space-y-2 rounded-lg border bg-card text-card-foreground shadow-sm p-4">
        <h3 className="font-semibold text-foreground">Detail Item</h3>
        <Separator />
        <DetailItem label="Kategori" value={project.category} />
        <DetailItem label="Kuantitas" value={project.quantity} />
        <DetailItem label="Ukuran" value={project.size} />
        <DetailItem label="Bahan" value={project.material} />
        <DetailItem label="Bentuk" value={project.form} />
        <DetailItem label="Panjang" value={project.length ? `${project.length} cm` : '-'} />
        <DetailItem label="Lebar" value={project.width ? `${project.width} cm` : '-'} />
        <DetailItem label="Berat" value={project.weight ? `${project.weight} gr` : '-'} />
      </div>

      <div className="space-y-2 rounded-lg border bg-card text-card-foreground shadow-sm p-4">
        <h3 className="font-semibold text-foreground">Detail Keuangan</h3>
        <Separator />
        <DetailItem label="Harga Satuan" value={formatCurrency(project.unit_price)} />
        <DetailItem label="Diskon" value={formatCurrency(project.discount)} />
        <DetailItem label="Uang Muka" value={formatCurrency(project.down_payment)} />
        <Separator />
        <DetailItem label="Total Harga" value={formatCurrency(project.total_price)} />
        <DetailItem label="Sisa Pembayaran" value={formatCurrency(project.remaining_payment)} />
      </div>
    </div>
  );
}
