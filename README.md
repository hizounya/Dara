# Dara in Tech

> **Work in progress on `feature/official-website`.** This repository is becoming the official Dara in Tech website: an Astro public site with the Talent Hub at `/hub/`.
>
> - The original single-file Talent Hub is preserved unchanged in [`legacy/talent-hub-v1/`](legacy/talent-hub-v1/). The Indonesian guide below describes that version. Its `index.html` now lives in that folder.
> - Plans and audit: [`docs/`](docs/).
> - Develop: Node 22+, `npm install`, `npm run dev` (copy `.env.example` to `.env` first).
> - Hub regression tests (uses your installed Google Chrome): `npm run test:hub:legacy`.

# Dara in Tech Talent Hub (v1)

Website komunitas dengan login member, database peserta, dan Talent Pool dengan skor kecocokan (match %).

Isi folder:

- `index.html`: seluruh website (satu file, tanpa build).
- `schema.sql`: tabel dan aturan akses database (Supabase).
- `README.md`: panduan ini.

Tanpa konfigurasi apa pun, `index.html` jalan dalam **mode demo** (data tersimpan di browser, kode login `123456`). Untuk peluncuran sungguhan, ikuti langkah di bawah (sekitar 15 menit).

## 1. Buat database (Supabase, gratis)

1. Daftar di supabase.com, lalu **New project**. Pilih region Singapore.
2. Buka **SQL Editor** > **New query**, tempel isi `schema.sql`, klik **Run**.
3. Kalau sebelumnya sudah menjalankan versi lama `schema.sql`, jalankan lagi file yang baru. Aman diulang, dan akan menambahkan kolom CV, tabel Mading, dan penyimpanan CV.

## 2. Atur login

1. **Authentication > Providers**: pastikan **Email** aktif.
2. **Authentication > URL Configuration**: isi **Site URL** dengan alamat website kamu (misalnya `https://daraintech.vercel.app`).
3. **Authentication > Email Templates > Magic Link**: tambahkan `{{ .Token }}` di badan email, misalnya `Kode kamu: {{ .Token }}`. Dengan ini member bisa mengetik kode 6 digit atau mengklik link.
4. **Email limit**: email bawaan Supabase dibatasi sangat kecil per jam. Untuk puluhan member, pasang SMTP sendiri di **Authentication > SMTP Settings** (Resend atau Brevo punya paket gratis), atau aktifkan login Google (langkah 5).

## 3. Hubungkan website ke database

Buka **Project Settings > API**, salin **Project URL** dan **anon public key**, lalu isi di `index.html`:

```js
const CONFIG={SUPABASE_URL:'https://xxxx.supabase.co',SUPABASE_ANON_KEY:'eyJ...',GOOGLE_LOGIN:false};
```

Anon key memang aman dipublikasikan. Yang melindungi data adalah aturan akses (Row Level Security) di `schema.sql`. Jangan pernah memasukkan `service_role` key ke file ini.

## 4. Deploy

Taruh `index.html` di GitHub lalu hubungkan ke Vercel (sama seperti JGTC), atau drag-and-drop foldernya ke Vercel/Netlify. Tidak ada langkah build.

## 5. (Opsional) Login Google

Aktifkan provider **Google** di **Authentication > Providers** (butuh OAuth client dari Google Cloud Console), lalu ubah `GOOGLE_LOGIN:true`.

## 6. Jadikan dirimu admin

1. Buka website, login dengan emailmu, dan selesaikan profil.
2. Di Supabase SQL Editor jalankan (ganti emailnya):

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'EMAIL_KAMU@example.com'
on conflict do nothing;
```

3. Refresh website. Tab **Admin** muncul: daftar semua peserta, pencarian, hapus peserta, dan **Export CSV**.

## Cara kerja skor match

Setiap lowongan dinilai terhadap profil member, total 0 sampai 100%:

| Komponen | Bobot | Cara hitung |
| --- | --- | --- |
| Skill wajib | 40 | Skill wajib yang dimiliki dibagi jumlah skill wajib |
| Skill tambahan | 10 | Sama, untuk skill nice-to-have |
| Bidang minat | 20 | Penuh jika bidang lowongan ada di minat member |
| Level | 15 | Sama level = penuh. Di bawah level lowongan dikurangi lebih besar daripada di atas |
| Setup kerja dan lokasi | 10 | Remote, hybrid, atau on-site, ditambah kecocokan kota |
| Jenis pekerjaan | 5 | Magang, full-time, freelance, dan seterusnya |

Komponen yang tidak bisa dinilai (misalnya lowongan tanpa skill tambahan, atau member yang belum memilih setup kerja) tidak ikut dihitung, jadi tidak mengurangi skor. Bobot ada di fungsi `matchScore` di `index.html` dan mudah disesuaikan.

## CV dan Mading

**Upload CV.** Member bisa mengunggah CV (PDF atau DOCX, maksimal 2 MB) di halaman Profile. File disimpan di bucket privat `cvs` di Supabase Storage, di folder bernama ID member masing-masing. CV hanya bisa diunduh oleh:

- pemiliknya sendiri,
- admin,
- member lain, hanya jika pemilik mencentang "Let members who post roles download my CV" **dan** masih ikut Talent Pool.

Tombol **Download CV** muncul di daftar kandidat (di dalam lowongan), di direktori member, dan di tabel admin. Aturan ini dijaga di database (Storage policy), bukan hanya di tampilan.

**Mading.** Tab baru untuk info komunitas. Jenisnya: Jobs, Events, Certifications, Programs & scholarships, dan Tips & sharing. Tombol **Post to Mading** membuka pilihan jenis:

- **Job** membuka formulir lowongan yang sama dengan Talent Pool, jadi tetap punya skor match dan muncul di kedua tempat.
- Jenis lain memakai formulir sederhana: judul, penyelenggara, tanggal (tanggal acara, batas daftar, atau batas apply), lokasi untuk event, detail, dan link.

Semua member yang login bisa membaca dan memposting. Penulis bisa mengedit dan menghapus postingannya. Admin bisa menghapus postingan siapa pun dan menyematkan (pin) postingan ke paling atas. Pin dijaga oleh trigger di database, jadi member biasa tidak bisa menyematkan lewat API.

## Privasi

- Member hanya tampil di Talent Pool jika mencentang opsi tersebut. Mereka bisa mematikannya kapan saja, atau menghapus profil dari halaman Profile.
- Yang terlihat oleh member lain (jika ikut pool): nama, headline, skill, level, kota, email kontak, LinkedIn, dan bio. Nomor telepon tidak dikumpulkan.
- CV berisi data pribadi. Tampilan website menjelaskan siapa yang bisa mengunduhnya, dan default-nya tidak dibagikan ke member lain.
- Admin melihat semua peserta, termasuk yang tidak ikut pool, dan bisa mengunduh semua CV.
- Karena data pribadi peserta disimpan, sebaiknya siapkan halaman kebijakan privasi singkat sebelum open registration.
