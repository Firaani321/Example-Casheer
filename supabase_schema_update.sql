-- Tambahkan kolom project_id dan partner_id ke tabel expenses
ALTER TABLE public.expenses
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

-- Tambahkan kolom payment_type_id ke tabel partner_payments
ALTER TABLE public.partner_payments
ADD COLUMN payment_type_id uuid REFERENCES public.payment_types(id) ON DELETE SET NULL;
