# PRD.md — MyArisan MVP

## 1. Product Overview

**Nama produk:** MyArisan
**Jenis produk:** Micro SaaS berbasis WhatsApp DM bot + dashboard web mobile-first
**Target utama:** Admin arisan dan anggota arisan di Indonesia
**Platform utama:** WhatsApp + Web Dashboard
**Stack:** Next.js, Neon PostgreSQL, Drizzle ORM, shadcn/ui, Tailwind CSS

MyArisan membantu admin arisan mencatat bukti transfer, melihat siapa yang sudah/belum bayar, mengatur giliran arisan, dan membuat rekap siap salin ke grup WhatsApp.

Produk ini tidak masuk ke grup WhatsApp. Grup arisan tetap digunakan seperti biasa oleh admin dan anggota. MyArisan bekerja melalui DM WhatsApp dan dashboard web.

---

## 2. Core Positioning

**One-liner:**

> MyArisan bantu admin arisan mencatat bukti transfer, rekap siapa sudah/belum bayar, dan membuat rekap siap kirim ke grup WhatsApp.

**Value utama:**

* Admin tidak perlu scroll bukti transfer satu-satu.
* Anggota bisa kirim bukti bayar lewat WhatsApp.
* Admin bisa cek bukti pending dari dashboard atau command bot.
* Rekap arisan lebih rapi dan bisa disalin ke grup.
* Sistem hemat biaya WhatsApp karena tidak mengirim pesan otomatis di luar window 24 jam.

---

## 3. Product Principles

1. **Mobile-first**
   Semua halaman harus nyaman dipakai dari HP.

2. **WhatsApp-first**
   User bisa melakukan hal penting lewat WhatsApp DM bot.

3. **Tidak ada outbound WhatsApp berbayar secara default**
   Bot tidak boleh mengirim pesan otomatis jika user tidak sedang dalam 24-hour service window.

4. **Tidak ada OTP WhatsApp**
   Login web menggunakan nomor WhatsApp + PIN pribadi 4 digit.

5. **QRIS manual untuk MVP**
   Pembayaran subscription admin dilakukan manual via QRIS milik owner MyArisan.

6. **Admin tetap pegang uang arisan**
   MyArisan tidak menjadi rekening bersama dan tidak memproses dana arisan anggota.

7. **AI hanya digunakan di bagian yang perlu**
   AI digunakan untuk membaca hasil OCR bukti transfer dan membantu parsing data pembayaran. Command basic tidak memakai AI.

---

## 4. Target Users

### 4.1 Admin Arisan

Admin adalah customer utama yang membayar subscription.

Admin membutuhkan:

* Buat arisan.
* Tambah daftar anggota.
* Share link/kode join ke grup WhatsApp.
* Lihat siapa sudah/belum bayar.
* Konfirmasi bukti transfer.
* Buat teks tagihan siap salin.
* Atur giliran.
* Export rekap.
* Bayar paket MyArisan.

### 4.2 Anggota Arisan

Anggota tidak membayar subscription.

Anggota membutuhkan:

* Join arisan.
* Buat PIN pribadi.
* Cek status bayar.
* Cek rekening admin.
* Kirim bukti transfer.
* Lihat giliran.
* Lihat riwayat pembayaran sendiri.

### 4.3 Owner MyArisan

Owner adalah pemilik SaaS.

Owner membutuhkan:

* Melihat seluruh admin/customer.
* Melihat invoice pending.
* Approve pembayaran QRIS manual.
* Mengaktifkan subscription.
* Melihat usage paket.
* Mengelola plan.
* Melihat arisan aktif.
* Melihat error sistem.

---

## 5. MVP Scope

### 5.1 Included in MVP

MVP harus mencakup:

1. Landing page sederhana.
2. Auth menggunakan nomor WhatsApp + PIN 4 digit.
3. Admin membuat arisan.
4. Admin menambahkan anggota.
5. Admin mendapatkan kode/link join.
6. Anggota join menggunakan kode/link.
7. Anggota membuat PIN 4 digit.
8. Dashboard admin mobile-first.
9. Dashboard anggota mobile-first.
10. Upload/kirim bukti pembayaran.
11. OCR + AI parsing bukti transfer.
12. Admin konfirmasi pembayaran.
13. Status pembayaran otomatis berubah.
14. Rekap sudah/belum bayar.
15. Teks tagihan siap salin ke grup.
16. Giliran arisan.
17. Paket subscription.
18. QRIS manual payment flow.
19. Owner dashboard untuk approve pembayaran subscription.
20. Usage limit bukti otomatis per paket.
21. Guard 24-hour WhatsApp window.
22. Tidak ada reminder personal otomatis.
23. Tidak ada OTP WhatsApp.
24. Tidak ada bot masuk grup.

---

## 6. Out of Scope for MVP

Fitur berikut tidak dikerjakan di MVP:

1. Bot masuk grup WhatsApp.
2. Reminder personal otomatis ke anggota.
3. OTP WhatsApp.
4. Auto-recurring payment.
5. Dynamic QRIS payment gateway.
6. Rekening bersama.
7. Escrow dana arisan.
8. Auto-approve pembayaran tanpa konfirmasi admin.
9. Mobile app native.
10. Push notification wajib.
11. Multi-language.
12. Bot voice note.
13. AI financial advice.
14. Integrasi bank/e-wallet langsung.
15. Auto-detect saldo rekening admin.
16. Broadcast WhatsApp di luar 24-hour window.
17. Fitur pinjaman/investasi.
18. Group chat automation.

---

## 7. Pricing & Plan

### 7.1 Plan MVP

| Plan    |           Harga | Batas Anggota | Kuota Bukti Otomatis | Target        |
| ------- | --------------: | ------------: | -------------------: | ------------- |
| Free    |             Rp0 |     5 anggota |       10 bukti/bulan | coba-coba     |
| Basic   |  Rp25.000/bulan |    15 anggota |       75 bukti/bulan | arisan kecil  |
| Pro     |  Rp50.000/bulan |    30 anggota |      150 bukti/bulan | arisan normal |
| Premium | Rp100.000/bulan |    75 anggota |      375 bukti/bulan | arisan besar  |

### 7.2 Rule Kuota Bukti

Rumus kuota bukti otomatis:

```text
kuota_bukti = 5 × batas_anggota
```

Tujuannya agar cukup untuk:

* Arisan bulanan.
* Arisan mingguan.
* Bukti salah upload.
* Bukti dobel.
* Pembayaran kurang.
* Transfer ulang.

### 7.3 Jika Kuota Habis

Jika kuota bukti otomatis habis:

* Admin tetap bisa mencatat pembayaran manual dari dashboard.
* Sistem tidak menjalankan OCR/AI untuk bukti baru.
* User melihat pesan upgrade.

Pesan:

```text
Kuota baca bukti otomatis bulan ini habis.

Pembayaran tetap bisa dicatat manual oleh admin dari dashboard.
Upgrade paket untuk menambah kuota bukti otomatis.
```

---

## 8. Subscription System

### 8.1 Subscription Level

Subscription berlaku per `arisan_group`, bukan per user.

Alasan:

* Satu admin bisa punya beberapa arisan.
* Satu arisan bisa aktif, arisan lain bisa expired.
* Batas anggota dan kuota bukti dihitung per arisan.

### 8.2 Subscription Status

Status subscription:

```text
trial
active
expired
canceled
```

### 8.3 Feature Gate

Fitur yang boleh walau expired:

* Login dashboard.
* Lihat data lama.
* Lihat anggota.
* Lihat rekap lama.
* Lihat status paket.
* Bayar paket.
* Download data basic jika tersedia.

Fitur yang dikunci saat expired:

* OCR/AI baca bukti baru.
* Konfirmasi pembayaran baru.
* Tambah anggota melebihi Free limit.
* Export Pro/Premium.
* Buat periode baru.
* Upgrade storage bukti.

### 8.4 Renewal Behavior

Jika admin membayar sebelum masa aktif habis, masa aktif ditambah dari `current_period_end`.

Contoh:

```text
Aktif sampai: 30 Juni
Bayar renewal: 25 Juni
Masa aktif baru: 30 Juli
```

Jika admin membayar setelah expired, masa aktif dihitung dari tanggal pembayaran.

---

## 9. Payment MVP — Manual QRIS

### 9.1 Payment Flow

1. Admin buka menu Paket.
2. Admin memilih paket.
3. Sistem membuat invoice dengan status `pending`.
4. Sistem menampilkan QRIS manual milik owner.
5. Admin membayar.
6. Admin upload bukti pembayaran.
7. Invoice masuk ke Owner Dashboard.
8. Owner mengecek pembayaran.
9. Owner klik `Terima`.
10. Invoice menjadi `paid`.
11. Subscription arisan aktif 30 hari.

### 9.2 Invoice Status

```text
pending
pending_verification
paid
rejected
expired
```

### 9.3 Owner Approval

Owner dashboard menampilkan:

* ID invoice.
* Nama admin.
* Nomor admin.
* Nama arisan.
* Paket.
* Nominal.
* Bukti pembayaran.
* Waktu upload.
* Tombol Terima.
* Tombol Tolak.

### 9.4 Jika Bukti Ditolak

Jika owner menolak bukti:

* Invoice status menjadi `rejected`.
* Admin bisa upload ulang bukti.
* Tidak ada WhatsApp outbound otomatis jika window sudah lewat.

---

## 10. WhatsApp Cost Policy

### 10.1 Core Rule

Bot MyArisan tidak boleh mengirim WhatsApp otomatis di luar 24-hour service window.

### 10.2 Service Window

Setiap user mengirim pesan ke bot, simpan:

```text
last_inbound_at = now
service_window_until = now + 24 hours
```

### 10.3 Send Guard

Semua pengiriman WhatsApp wajib melalui satu service/function.

Pseudo logic:

```text
sendWhatsApp(user, message):
  if now < user.service_window_until:
      send service message
      log as free_window
  else:
      create dashboard notification
      log as skipped_outside_window
      do not send WhatsApp
```

### 10.4 Tidak Ada Fitur Ini di MVP

* Reminder personal otomatis.
* OTP WhatsApp.
* Broadcast tagihan otomatis.
* Admin notification otomatis kalau window admin sudah lewat.
* Member notification otomatis kalau window member sudah lewat.

### 10.5 Jika Admin Window Masih Aktif

Jika admin masih dalam window 24 jam, bot boleh mengirim info:

```text
Ada bukti bayar baru dari Sinta.
Cek dashboard atau balas "konfirmasi".
```

Jika window admin sudah lewat, bot tidak mengirim WhatsApp. Bukti hanya masuk dashboard.

---

## 11. Auth System

### 11.1 Login Method

User login dashboard menggunakan:

```text
Nomor WhatsApp + PIN pribadi 4 digit
```

Tidak ada OTP WhatsApp.

### 11.2 Join Flow Anggota

Admin membagikan kode join ke grup WhatsApp:

```text
JOIN ARS123
```

Anggota chat MyArisan duluan:

```text
JOIN ARS123
```

Bot membalas:

```text
Kamu mau masuk:
Arisan Ibu-Ibu RT 03

Pilih nama kamu:
1. Sinta
2. Rina
3. Dewi
4. Fitri
```

Anggota memilih nama.

Bot meminta PIN:

```text
Sekarang buat PIN 4 angka untuk login dashboard.
Contoh: 2580
```

Sistem menyimpan PIN dalam bentuk hash, bukan plain text.

### 11.3 Login Web

Form login:

* Nomor WhatsApp.
* PIN 4 digit.

Setelah login:

* Jika user hanya punya 1 arisan, langsung masuk.
* Jika user punya banyak arisan, tampilkan pilihan arisan.

### 11.4 Lupa PIN

Tidak ada OTP.

Flow reset PIN:

1. User chat MyArisan duluan dengan pesan `reset pin`.
2. Karena user memulai chat, bot boleh membalas.
3. Bot meminta PIN baru.
4. User mengirim PIN baru.
5. Sistem menyimpan hash PIN baru.

Di web tampilkan instruksi:

```text
Lupa PIN? Chat "reset pin" ke MyArisan dari nomor WhatsApp kamu.
```

### 11.5 Security Rule

User hanya bisa mengakses arisan yang terhubung dengan membership miliknya.

Setiap request dashboard wajib memvalidasi:

```text
user_id + arisan_group_id + role
```

Jangan pernah hanya mengandalkan URL.

---

## 12. Core User Flows

### 12.1 Admin Membuat Arisan

1. Admin chat MyArisan.
2. Admin pilih `Buat Arisan`.
3. Bot meminta nama arisan.
4. Bot meminta nominal setoran.
5. Bot meminta periode: mingguan/bulanan.
6. Bot meminta tanggal jatuh tempo.
7. Bot meminta rekening admin.
8. Sistem membuat arisan.
9. Admin diarahkan menambahkan anggota.

### 12.2 Admin Menambah Anggota

Admin dapat menambahkan anggota dengan paste daftar nama:

```text
Tambah anggota:
Sinta
Rina
Dewi
Fitri
Agus
```

Sistem membuat anggota tanpa nomor WhatsApp terlebih dahulu.

Setelah itu sistem memberi kode/link join:

```text
JOIN ARS123
```

### 12.3 Anggota Join Arisan

1. Anggota chat `JOIN ARS123`.
2. Bot menampilkan daftar nama.
3. Anggota memilih nama.
4. Anggota membuat PIN pribadi.
5. Sistem menghubungkan nomor WhatsApp anggota dengan nama di arisan.
6. Anggota bisa login dashboard.

### 12.4 Anggota Membayar

1. Anggota chat `bayar`.
2. Bot mengirim info setoran dan rekening admin.
3. Anggota transfer ke rekening admin.
4. Anggota mengirim screenshot bukti transfer ke MyArisan.
5. Sistem OCR + AI parsing bukti.
6. Bukti masuk status `pending`.
7. Bot membalas ke anggota bahwa bukti diterima.
8. Jika admin window aktif, bot boleh memberi info ke admin.
9. Jika admin window tidak aktif, bukti hanya muncul di dashboard admin.

### 12.5 Admin Konfirmasi Bukti

Admin bisa konfirmasi dari dashboard atau WhatsApp.

Dari dashboard:

1. Admin buka menu `Konfirmasi Bukti`.
2. Admin melihat daftar bukti pending.
3. Admin membuka detail bukti.
4. Admin klik `Terima`, `Tolak`, atau `Edit`.
5. Status pembayaran berubah.

Dari WhatsApp:

1. Admin chat `konfirmasi`.
2. Bot menampilkan daftar bukti pending.
3. Admin memilih nomor bukti.
4. Bot menampilkan detail.
5. Admin memilih `Terima`, `Tolak`, atau `Edit`.

### 12.6 Admin Membuat Rekap

Admin chat:

```text
rekap
```

Bot membalas teks rekap siap salin:

```text
📌 Rekap Arisan Ibu-Ibu RT 03
Periode: Juni 2026

Sudah bayar: 12/20
Belum bayar: 8
Menunggu dicek: 3
Total terkumpul: Rp1.200.000

Belum bayar:
- Rina
- Dewi
- Agus

Giliran bulan ini:
Dewi
```

Admin copy-paste ke grup WhatsApp.

### 12.7 Admin Membuat Teks Tagihan

Admin chat:

```text
tagih
```

Bot membalas teks siap salin:

```text
Teman-teman, reminder arisan Juni ya 🙏

Yang belum setor:
- Rina
- Dewi
- Agus

Mohon setor maksimal tanggal 10.
Kalau sudah transfer, kirim bukti ke MyArisan.
```

---

## 13. WhatsApp Bot Commands

### 13.1 Admin Commands

```text
menu
buat arisan
rekap
belum bayar
tagih
konfirmasi
anggota
giliran
paket
dashboard
bantuan
reset pin
```

### 13.2 Member Commands

```text
menu
join
bayar
status
rekening
giliran
riwayat
dashboard
bantuan
reset pin
```

### 13.3 Command Handling

Command basic harus deterministic/rule-based.

AI tidak dipakai untuk:

* `menu`
* `rekap`
* `status`
* `bayar`
* `paket`
* `konfirmasi`
* `tagih`

AI hanya dipakai saat:

* parsing bukti transfer.
* memahami caption bukti yang tidak jelas.
* mencocokkan nama rekening dengan anggota.
* membantu teks tagihan jika perlu.

---

## 14. AI & OCR System

### 14.1 Model

MVP menggunakan:

```text
DeepSeek V4 Flash
```

### 14.2 OCR Pipeline

1. User mengirim gambar bukti transfer.
2. Backend download media dari WhatsApp.
3. Gambar dikompres.
4. OCR mengekstrak teks.
5. Hasil OCR dikirim ke DeepSeek V4 Flash.
6. AI mengembalikan JSON.
7. Sistem mencocokkan hasil dengan data arisan.
8. Status pembayaran menjadi `pending`.

### 14.3 AI Output Schema

```json
{
  "detected_amount": 100000,
  "detected_date": "2026-06-18",
  "detected_sender_name": "SINTA AYU",
  "detected_bank_or_wallet": "BCA",
  "matched_member_name": "Sinta",
  "matched_period": "Juni 2026",
  "confidence": 0.91,
  "notes": "Nominal sesuai dengan setoran periode aktif."
}
```

### 14.4 AI Safety Rule

AI tidak boleh auto-confirm pembayaran.

Semua pembayaran hasil AI masuk status:

```text
pending
```

Admin tetap harus konfirmasi.

### 14.5 Duplicate Detection

Sistem harus mencoba mendeteksi bukti dobel berdasarkan:

* image hash.
* nominal.
* tanggal transfer.
* nama pengirim.
* nomor referensi jika terbaca.
* member yang sama.
* periode yang sama.

Jika duplikat terdeteksi:

```text
Bukti ini mirip dengan pembayaran yang sudah pernah dikirim.
Status: perlu dicek admin.
```

---

## 15. Dashboard Web

### 15.1 Design Direction

Dashboard harus:

* mobile-first.
* clean.
* modern.
* minimal.
* mudah dipahami ibu-ibu arisan.
* menggunakan shadcn/ui.
* glass effect boleh digunakan secukupnya.
* tidak terlalu ramai.
* teks harus jelas dan besar.
* tombol utama harus mudah ditekan dari HP.

### 15.2 Dashboard Login

Form:

* Nomor WhatsApp.
* PIN 4 digit.

Tidak ada OTP.

### 15.3 Arisan Switcher

Jika user punya lebih dari 1 arisan, tampilkan:

```text
Pilih Arisan

1. Arisan Ibu-Ibu RT 03
   Role: Admin

2. Arisan Keluarga Besar
   Role: Anggota
```

User hanya melihat arisan yang dia ikuti.

### 15.4 Admin Dashboard Home

Komponen utama:

* Nama arisan.
* Periode aktif.
* Status paket.
* Jumlah anggota.
* Progress sudah bayar.
* Total terkumpul.
* Bukti menunggu konfirmasi.
* Anggota belum bayar.
* Giliran bulan ini.

CTA utama:

* Konfirmasi Bukti.
* Salin Rekap.
* Salin Tagihan.
* Tambah Anggota.
* Atur Giliran.

### 15.5 Admin Pages

#### Ringkasan

Menampilkan:

* Sudah bayar.
* Belum bayar.
* Menunggu dicek.
* Total terkumpul.
* Jatuh tempo.
* Giliran bulan ini.

#### Pembayaran

Tab:

* Menunggu Dicek.
* Sudah Diterima.
* Ditolak.
* Manual.

Aksi:

* Terima.
* Tolak.
* Edit nominal.
* Lihat bukti.

#### Anggota

Aksi:

* Tambah anggota.
* Edit nama.
* Hapus anggota.
* Salin link/kode join.
* Lihat status pembayaran anggota.

#### Giliran

Aksi:

* Set urutan manual.
* Acak giliran.
* Ubah giliran bulan ini.
* Lihat riwayat pemenang.

#### Rekap

Aksi:

* Salin rekap ke grup.
* Salin teks tagihan.
* Export PDF.
* Export Excel jika paket mendukung.

#### Paket

Menampilkan:

* Plan aktif.
* Tanggal aktif sampai.
* Limit anggota.
* Kuota bukti otomatis.
* Pemakaian bukti bulan ini.
* Tombol perpanjang/upgrade.

### 15.6 Member Dashboard Home

Menampilkan:

* Nama arisan.
* Status bayar periode ini.
* Nominal setoran.
* Jatuh tempo.
* Rekening admin.
* Giliran bulan ini.
* Riwayat pembayaran sendiri.

CTA:

* Kirim Bukti Bayar.
* Cek Riwayat.
* Lihat Giliran.
* Lihat Rekening.

---

## 16. Landing Page MVP

Landing page harus fokus pada pesan sederhana.

### 16.1 Hero Copy

Headline:

```text
Rekap arisan jadi rapi tanpa scroll bukti transfer satu-satu.
```

Subheadline:

```text
MyArisan bantu admin mencatat bukti bayar, cek siapa yang sudah/belum bayar, dan membuat rekap siap kirim ke grup WhatsApp.
```

CTA:

```text
Coba Gratis
```

Secondary CTA:

```text
Lihat Cara Kerja
```

### 16.2 Landing Sections

1. Hero.
2. Problem.
3. How it works.
4. Features.
5. Pricing.
6. FAQ.
7. CTA akhir.

### 16.3 Problem Section

Masalah utama:

* Bukti transfer tenggelam di chat.
* Admin lupa siapa yang sudah bayar.
* Anggota sering nanya status.
* Rekap manual bikin ribet.
* Salah catat bisa bikin ribut.

### 16.4 How It Works

1. Admin buat arisan.
2. Admin share kode join ke grup.
3. Anggota kirim bukti ke MyArisan.
4. Admin konfirmasi.
5. Rekap otomatis rapi.

---

## 17. Database Schema Draft

### 17.1 users

```text
id
phone
name
pin_hash
last_inbound_at
service_window_until
created_at
updated_at
```

### 17.2 arisan_groups

```text
id
admin_user_id
name
amount_per_period
period_type
due_day
bank_account_text
status
created_at
updated_at
```

### 17.3 memberships

```text
id
arisan_group_id
user_id
role
display_name
join_status
created_at
updated_at
```

Role:

```text
admin
member
```

### 17.4 periods

```text
id
arisan_group_id
name
start_date
due_date
draw_member_id
status
created_at
updated_at
```

Status:

```text
active
closed
draft
```

### 17.5 payments

```text
id
arisan_group_id
period_id
member_user_id
amount
status
proof_image_url
ocr_text
ai_result_json
confirmed_by_user_id
confirmed_at
created_at
updated_at
```

Status:

```text
pending
confirmed
rejected
partial
manual
duplicate_check
```

### 17.6 plans

```text
id
name
price
max_members
monthly_proof_limit
max_groups
max_admins
features_json
created_at
updated_at
```

### 17.7 subscriptions

```text
id
arisan_group_id
admin_user_id
plan_id
status
current_period_start
current_period_end
created_at
updated_at
```

Status:

```text
trial
active
expired
canceled
```

### 17.8 invoices

```text
id
arisan_group_id
admin_user_id
plan_id
amount
status
payment_method
proof_image_url
paid_at
verified_by_user_id
created_at
updated_at
```

Status:

```text
pending
pending_verification
paid
rejected
expired
```

Payment method:

```text
manual_qris
```

### 17.9 usage_counters

```text
id
arisan_group_id
month
proof_used
proof_limit
created_at
updated_at
```

### 17.10 message_logs

```text
id
whatsapp_message_id
user_id
from_phone
direction
message_type
body
media_url
cost_type
processed_status
created_at
```

Cost type:

```text
free_window
skipped_outside_window
manual
unknown
```

### 17.11 dashboard_notifications

```text
id
user_id
arisan_group_id
title
message
type
is_read
created_at
```

### 17.12 audit_logs

```text
id
arisan_group_id
actor_user_id
action
entity_type
entity_id
before_json
after_json
created_at
```

---

## 18. Access Control

### 18.1 Membership-Based Access

Every dashboard request must validate:

```text
user_id has membership in arisan_group_id
```

### 18.2 Role-Based Access

Admin can:

* View all members.
* View all payments.
* Confirm/reject payments.
* Edit arisan settings.
* Manage members.
* Manage subscription.

Member can:

* View own payment status.
* View own payment history.
* View general arisan info.
* View giliran.
* Upload proof.
* Cannot see other members’ proof image.
* Cannot confirm payments.
* Cannot edit arisan.

### 18.3 Owner Access

Owner can access internal admin panel.

Owner can:

* View invoices.
* Approve/reject manual QRIS payments.
* View all subscriptions.
* View usage.
* View system logs.

---

## 19. Environment Variables

Required env:

```text
DATABASE_URL=

NEXT_PUBLIC_APP_URL=

WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=

DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com

STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

OWNER_PHONE=
```

Optional env:

```text
OCR_PROVIDER=
OCR_API_KEY=
```

---

## 20. Acceptance Criteria

### 20.1 Admin

MVP is acceptable if admin can:

* Create arisan.
* Add members.
* Share join code.
* See dashboard.
* Confirm payment proof.
* See rekap.
* Copy rekap text.
* Copy tagihan text.
* Manage giliran.
* Choose package.
* Upload QRIS payment proof.
* Get subscription activated after owner approval.

### 20.2 Member

MVP is acceptable if member can:

* Join using code.
* Select their name.
* Create PIN.
* Login web using phone + PIN.
* See payment status.
* See admin bank account.
* Upload payment proof.
* See payment history.
* See giliran.

### 20.3 Owner

MVP is acceptable if owner can:

* See pending subscription invoices.
* View uploaded payment proof.
* Approve/reject invoice.
* Activate subscription.
* See active subscriptions.
* See basic usage.

### 20.4 Cost Guard

MVP is acceptable only if:

* No OTP WhatsApp exists.
* No automatic personal reminder exists.
* No WhatsApp message is sent outside service window by default.
* WhatsApp send function blocks outbound message when window is expired.
* Dashboard notification is created instead of WhatsApp outbound.

---

## 21. MVP Milestones

### Milestone 1 — Project Setup

* Next.js App Router.
* Tailwind CSS.
* shadcn/ui.
* Drizzle ORM.
* Neon PostgreSQL.
* Basic layout.
* Auth skeleton.

### Milestone 2 — Database & Auth

* Users table.
* PIN login.
* Membership system.
* Arisan switcher.
* Role-based access.

### Milestone 3 — Arisan Core

* Create arisan.
* Add members.
* Join code.
* Member claim name.
* Dashboard admin/member.

### Milestone 4 — Payment Proof Core

* Upload proof.
* OCR placeholder/provider.
* DeepSeek parser.
* Pending payment.
* Admin confirmation.
* Rekap update.

### Milestone 5 — Subscription MVP

* Plans.
* Invoices.
* Manual QRIS page.
* Upload payment proof.
* Owner approval.
* Subscription activation.
* Feature gate.

### Milestone 6 — WhatsApp Bot MVP

* Webhook receive message.
* Basic command handler.
* Update service window.
* Send guard.
* JOIN flow.
* Bayar flow.
* Status flow.
* Rekap flow.
* Konfirmasi flow.

### Milestone 7 — Landing Page

* Modern clean minimal UI.
* Glass effect.
* Mobile-first.
* Hero/problem/features/pricing/FAQ.
* CTA to WhatsApp or sign up.

---

## 22. UI Language Guidelines

Use simple Indonesian terms.

Use:

```text
Rekap
Sudah Bayar
Belum Bayar
Menunggu Dicek
Kirim Bukti
Terima
Tolak
Edit
Tagih
Giliran
Salin ke Grup
Paket
Aktif Sampai
```

Avoid:

```text
Subscription
Tenant
OCR
Parser
Webhook
Pending Verification
Authentication
Invoice
```

For user-facing UI, translate:

* Subscription → Paket
* Invoice → Tagihan Paket
* Pending → Menunggu Dicek
* OCR/AI → Baca Bukti Otomatis
* Dashboard → Halaman Arisan

---

## 23. MVP Success Metrics

Initial validation metrics:

* 10 admin arisan mencoba Free.
* 3 admin membayar paket Basic/Pro.
* Minimal 1 arisan aktif mencatat pembayaran 1 periode penuh.
* Admin menggunakan fitur salin rekap minimal 2 kali.
* Minimal 50 bukti pembayaran diproses.
* Error parsing bukti di bawah 20% untuk bukti yang jelas.
* Tidak ada biaya WhatsApp outbound tak terduga.
* Admin memahami produk tanpa penjelasan panjang.

---

## 24. Final MVP Summary

MyArisan MVP adalah SaaS arisan mobile-first yang memakai WhatsApp DM bot dan dashboard web untuk membantu admin mencatat bukti transfer, konfirmasi pembayaran, melihat rekap, dan menyalin tagihan ke grup WhatsApp.

MVP tidak memakai bot grup, tidak memakai OTP WhatsApp, tidak memakai reminder personal otomatis, dan tidak mengirim pesan WhatsApp di luar 24-hour service window secara default.

Pembayaran subscription MVP menggunakan QRIS manual dengan invoice internal dan owner approval.

Fokus utama MVP:

```text
Admin arisan tidak perlu scroll bukti transfer lagi.
Anggota kirim bukti ke MyArisan.
Admin konfirmasi.
Rekap langsung rapi.
```
