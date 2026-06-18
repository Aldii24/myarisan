import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Ketentuan Layanan",
  description:
    "Ketentuan penggunaan MyArisan sebagai alat pencatatan bukti setoran dan rekap arisan.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Ketentuan Layanan | MyArisan",
    description:
      "Ketentuan penggunaan MyArisan untuk admin dan anggota arisan.",
    url: "/terms",
  },
};

const sections = [
  {
    title: "Penerimaan ketentuan",
    paragraphs: [
      "Dengan membuat akun, bergabung ke arisan, mengirim bukti, atau memakai fitur MyArisan, pengguna menyetujui Ketentuan Layanan ini. Jika tidak menyetujui ketentuan ini, pengguna sebaiknya tidak memakai layanan.",
    ],
  },
  {
    title: "Fungsi MyArisan",
    paragraphs: [
      "MyArisan adalah alat bantu pencatatan untuk admin dan anggota arisan. Layanan membantu mencatat bukti setoran, menampilkan status pembayaran, mengelola keanggotaan, dan membuat teks rekap yang dapat disalin ke grup.",
      "MyArisan tidak menjamin kelangsungan suatu arisan, kejujuran pesertanya, ketepatan giliran, atau penyelesaian perselisihan antara admin dan anggota.",
    ],
  },
  {
    title: "Tanggung jawab admin",
    items: [
      "Memastikan informasi arisan, nominal setoran, rekening, tenggat, anggota, dan periode dimasukkan dengan benar.",
      "Memeriksa setiap bukti pembayaran yang berstatus Menunggu Dicek sebelum menerima atau menolaknya.",
      "Mengelola dana arisan dan memenuhi kesepakatan yang dibuat dengan anggota.",
      "Menjaga akses akun dan PIN pribadi serta tidak memberikan akses admin kepada pihak yang tidak berwenang.",
    ],
  },
  {
    title: "Tanggung jawab pengguna",
    items: [
      "Memberikan informasi akun yang benar dan menggunakan nomor WhatsApp yang berada dalam kendalinya.",
      "Tidak mengunggah bukti pembayaran palsu, dimanipulasi, menyesatkan, atau milik pihak lain tanpa izin.",
      "Tidak menggunakan MyArisan untuk penipuan, pencucian uang, aktivitas ilegal, atau tindakan yang merugikan pihak lain.",
      "Tidak mencoba mengganggu, membobol, menyalin secara tidak sah, atau menyalahgunakan layanan.",
    ],
  },
  {
    title: "Pembayaran dan dana arisan",
    paragraphs: [
      "MyArisan bukan bank, payment gateway, penyelenggara transfer dana, penyedia pinjaman, atau escrow. Dana arisan selalu ditransfer langsung oleh anggota ke rekening bank atau e-wallet milik admin.",
      "Admin bertanggung jawab atas verifikasi akhir pembayaran dan pengelolaan dana. Informasi yang dibaca otomatis dari bukti dapat tidak akurat dan harus diperiksa kembali.",
    ],
  },
  {
    title: "Paket layanan",
    paragraphs: [
      "Sebagian fitur memiliki batas penggunaan berdasarkan paket. Informasi harga, jumlah anggota, dan kuota baca bukti otomatis ditampilkan pada layanan dan dapat diperbarui dari waktu ke waktu.",
      "Pada tahap MVP, pembayaran paket dapat menggunakan QRIS dengan pemeriksaan bukti secara manual. Paket baru aktif setelah pembayaran dikonfirmasi. Proses ini bukan bagian dari pengelolaan dana arisan.",
    ],
  },
  {
    title: "Ketersediaan dan perubahan layanan",
    paragraphs: [
      "MyArisan dapat memperbaiki, menambah, mengubah, membatasi, atau menghentikan fitur seiring perkembangan produk. Kami berupaya menjaga layanan tetap tersedia, tetapi tidak menjamin layanan selalu bebas gangguan atau kesalahan.",
      "Akses dapat dibatasi atau dihentikan apabila terdapat pelanggaran ketentuan, risiko keamanan, penyalahgunaan, atau kebutuhan hukum dan operasional.",
    ],
  },
  {
    title: "Batas tanggung jawab",
    paragraphs: [
      "Sejauh diizinkan hukum, MyArisan tidak bertanggung jawab atas kehilangan dana, perselisihan antaranggota, kesalahan transfer, bukti palsu, keputusan admin, atau kerugian yang timbul dari kesepakatan arisan.",
      "Pengguna bertanggung jawab untuk memeriksa informasi penting dan menyelesaikan kewajiban arisan sesuai kesepakatan masing-masing.",
    ],
  },
  {
    title: "Perubahan ketentuan dan kontak",
    paragraphs: [
      "Ketentuan ini dapat diperbarui agar sesuai dengan perubahan produk, operasional, atau peraturan. Tanggal pembaruan terbaru akan ditampilkan pada halaman ini.",
      "Pertanyaan tentang ketentuan layanan dapat dikirim ke aldiirawan240703@gmail.com.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      intro="Aturan dasar penggunaan MyArisan sebagai alat bantu pencatatan—bukan tempat menyimpan dana."
      sections={sections}
      title="Ketentuan Layanan"
      updatedAt="18 Juni 2026"
    />
  );
}
