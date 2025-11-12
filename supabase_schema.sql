-- Pastikan untuk menjalankan ini pada database Supabase yang bersih
-- atau hapus tabel yang ada sebelum menjalankan.

-- Tabel untuk Pelanggan
CREATE TABLE public.customers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    name text NOT NULL,
    contact_information text NULL,
    CONSTRAINT customers_pkey PRIMARY KEY (id)
);

-- Tabel untuk Mitra
CREATE TABLE public.partners (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    name text NOT NULL,
    contact_information text NULL,
    CONSTRAINT partners_pkey PRIMARY KEY (id)
);

-- Tabel untuk Petugas/Penanggung Jawab
CREATE TABLE public.handlers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    name text NOT NULL,
    CONSTRAINT handlers_pkey PRIMARY KEY (id)
);

-- Tabel untuk Kategori Proyek
CREATE TABLE public.categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    name text NOT NULL,
    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_name_key UNIQUE (name)
);

-- Tabel untuk Tipe Pembayaran
CREATE TABLE public.payment_types (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    name text NOT NULL,
    CONSTRAINT payment_types_pkey PRIMARY KEY (id)
);

-- Menambahkan nilai default untuk tipe pembayaran
INSERT INTO public.payment_types (id, name) VALUES 
('uang-muka', 'Uang Muka') ON CONFLICT (id) DO NOTHING;

-- Tabel untuk Proyek
CREATE TABLE public.projects (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    customer_id uuid NOT NULL,
    project_name text NOT NULL,
    project_details text NULL,
    handler_id uuid NOT NULL,
    project_status text NOT NULL DEFAULT 'Tertunda'::text,
    payment_status text NOT NULL DEFAULT 'Belum Lunas'::text,
    quantity integer NOT NULL,
    category text NULL,
    form text NULL,
    length numeric NULL,
    width numeric NULL,
    material text NULL,
    weight numeric NULL,
    size text NULL,
    unit_price numeric NOT NULL DEFAULT 0,
    discount numeric NULL DEFAULT 0,
    total_price numeric NOT NULL DEFAULT 0,
    down_payment numeric NULL DEFAULT 0,
    remaining_payment numeric NOT NULL DEFAULT 0,
    CONSTRAINT projects_pkey PRIMARY KEY (id),
    CONSTRAINT projects_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT,
    CONSTRAINT projects_handler_id_fkey FOREIGN KEY (handler_id) REFERENCES public.handlers(id) ON DELETE RESTRICT,
    CONSTRAINT projects_category_fkey FOREIGN KEY (category) REFERENCES public.categories(name) ON DELETE SET NULL,
    CONSTRAINT projects_project_status_check CHECK ((project_status = ANY (ARRAY['Tertunda'::text, 'Dikerjakan'::text, 'Selesai'::text, 'Dibatalkan'::text]))),
    CONSTRAINT projects_payment_status_check CHECK ((payment_status = ANY (ARRAY['Belum Lunas'::text, 'Dibayar Sebagian'::text, 'Lunas'::text])))
);

-- Tabel untuk Pengeluaran
CREATE TABLE public.expenses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    payment_type_id uuid NOT NULL,
    description text NOT NULL,
    total_expense_amount numeric NOT NULL,
    project_id uuid NULL,
    partner_id uuid NULL,
    CONSTRAINT expenses_pkey PRIMARY KEY (id),
    CONSTRAINT expenses_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
    CONSTRAINT expenses_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL,
    CONSTRAINT expenses_payment_type_id_fkey FOREIGN KEY (payment_type_id) REFERENCES public.payment_types(id)
);

-- Tabel untuk Pembayaran Pelanggan
CREATE TABLE public.customer_payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    project_id uuid NOT NULL,
    payment_type_id uuid NOT NULL,
    total_payment numeric NOT NULL,
    amount_paid numeric NOT NULL,
    remaining_payment numeric NOT NULL,
    CONSTRAINT customer_payments_pkey PRIMARY KEY (id),
    CONSTRAINT customer_payments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
    CONSTRAINT customer_payments_payment_type_id_fkey FOREIGN KEY (payment_type_id) REFERENCES public.payment_types(id)
);

-- Tabel untuk Pembayaran ke Mitra
CREATE TABLE public.partner_payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    project_id uuid NOT NULL,
    partner_id uuid NOT NULL,
    payment_type_id uuid NOT NULL,
    amount numeric NOT NULL,
    description text NULL,
    CONSTRAINT partner_payments_pkey PRIMARY KEY (id),
    CONSTRAINT partner_payments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
    CONSTRAINT partner_payments_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE,
    CONSTRAINT partner_payments_payment_type_id_fkey FOREIGN KEY (payment_type_id) REFERENCES public.payment_types(id)
);

-- Tabel untuk Piutang dari Mitra
CREATE TABLE public.partner_receivables (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    partner_id uuid NOT NULL,
    amount numeric NOT NULL,
    description text NOT NULL,
    CONSTRAINT partner_receivables_pkey PRIMARY KEY (id),
    CONSTRAINT partner_receivables_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE
);
