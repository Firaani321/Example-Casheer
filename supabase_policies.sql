-- Aktifkan Row Level Security (RLS) untuk semua tabel
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handlers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_receivables ENABLE ROW LEVEL SECURITY;

-- Hapus kebijakan yang ada (jika ada) untuk memastikan tidak ada duplikasi
DROP POLICY IF EXISTS "Public access for all users" ON public.customers;
DROP POLICY IF EXISTS "Public access for all users" ON public.partners;
DROP POLICY IF EXISTS "Public access for all users" ON public.handlers;
DROP POLICY IF EXISTS "Public access for all users" ON public.categories;
DROP POLICY IF EXISTS "Public access for all users" ON public.payment_types;
DROP POLICY IF EXISTS "Public access for all users" ON public.projects;
DROP POLICY IF EXISTS "Public access for all users" ON public.expenses;
DROP POLICY IF EXISTS "Public access for all users" ON public.customer_payments;
DROP POLICY IF EXISTS "Public access for all users" ON public.partner_payments;
DROP POLICY IF EXISTS "Public access for all users" ON public.partner_receivables;

-- Buat kebijakan yang mengizinkan semua aksi (SELECT, INSERT, UPDATE, DELETE)
-- Ini cocok untuk pengembangan. Untuk produksi, Anda perlu kebijakan yang lebih ketat.
CREATE POLICY "Public access for all users" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for all users" ON public.partners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for all users" ON public.handlers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for all users" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for all users" ON public.payment_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for all users" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for all users" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for all users" ON public.customer_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for all users" ON public.partner_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for all users" ON public.partner_receivables FOR ALL USING (true) WITH CHECK (true);
