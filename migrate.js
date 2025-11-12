require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Inisialisasi Klien Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Pastikan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY sudah diatur di file .env Anda.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Daftar semua tabel yang akan dimigrasikan (sesuai db.json)
const tableNames = [
  'projects',
  'customers',
  'expenses',
  'partner_payments',
  'partner_receivables',
  'customer_payments',
  'partner_receivable_payments',
  'partners',
  'payment_types',
  'handlers',
  'categories'
];

async function migrateData() {
  console.log('Memulai migrasi data dari Supabase ke db.json...');

  try {
    const allData = {};

    // 3. Ambil data dari setiap tabel secara paralel
    const fetchPromises = tableNames.map(async (table) => {
      console.log(`-> Mengambil data dari tabel: ${table}`);
      const { data, error } = await supabase.from(table).select('*');
      
      if (error) {
        console.error(`Error saat mengambil data dari ${table}:`, error.message);
        // Jika tabel tidak ada, kita anggap sebagai array kosong
        if (error.code === '42P01') {
            console.warn(`Peringatan: Tabel '${table}' tidak ditemukan di Supabase. Akan menggunakan array kosong.`);
            return [table, []];
        } 
        throw error;
      }
      
      console.log(`   ... Berhasil! Ditemukan ${data.length} baris.`);
      return [table, data];
    });

    const results = await Promise.all(fetchPromises);

    // 4. Susun data ke dalam format yang benar
    for (const [table, data] of results) {
      allData[table] = data;
    }

    // 5. Tulis data ke dalam file db.json
    const dbPath = path.join(__dirname, 'db.json');
    fs.writeFileSync(dbPath, JSON.stringify(allData, null, 2));

    console.log('\n[32mMigrasi berhasil! Semua data telah disimpan di db.json.[0m');

  } catch (error) {
    console.error('\n[31mGagal melakukan migrasi:[0m', error.message);
    process.exit(1);
  }
}

migrateData();
