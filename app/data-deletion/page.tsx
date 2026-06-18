import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Penghapusan Data",
  description:
    "Petunjuk meminta penghapusan akun, bukti pembayaran, atau data arisan dari MyArisan.",
  alternates: { canonical: "/data-deletion" },
  openGraph: {
    title: "Penghapusan Data | MyArisan",
    description:
      "Cara mengajukan permintaan penghapusan data kepada MyArisan.",
    url: "/data-deletion",
  },
};

const sections = [
  {
    title: "Cara mengajukan permintaan",
    paragraphs: [
      "Kirim email ke aldiirawan240703@gmail.com dengan subjek “Permintaan Penghapusan Data MyArisan”. Permintaan sebaiknya dikirim dari alamat email yang dapat digunakan untuk komunikasi lanjutan.",
    ],
  },
  {
    title: "Informasi yang perlu disertakan",
    items: [
      "Nomor WhatsApp yang digunakan pada akun MyArisan.",
      "Nama arisan yang terkait dengan permintaan.",
      "Peran Anda dalam arisan tersebut: admin atau anggota.",
      "Jenis permintaan, misalnya penghapusan akun, gambar bukti pembayaran tertentu, seluruh bukti pembayaran, keanggotaan, atau grup arisan.",
      "Penjelasan tambahan yang membantu kami menemukan data secara tepat, tanpa mengirim PIN atau informasi keamanan akun.",
    ],
  },
  {
    title: "Verifikasi permintaan",
    paragraphs: [
      "Kami dapat meminta informasi tambahan untuk memastikan pemohon berhak atas akun atau data yang diminta. Langkah ini diperlukan untuk mencegah pihak lain menghapus data tanpa izin.",
      "Jangan pernah mengirim PIN pribadi melalui email. Tim MyArisan tidak memerlukan PIN untuk memproses permintaan penghapusan.",
    ],
  },
  {
    title: "Permintaan dari anggota",
    paragraphs: [
      "Anggota dapat meminta penghapusan akun dan data pribadi yang terkait, termasuk gambar bukti pembayaran, sejauh penghapusan dapat dilakukan secara operasional dan tidak bertentangan dengan kebutuhan keamanan, penyelesaian sengketa, atau kewajiban hukum.",
      "Penghapusan data anggota dapat memengaruhi riwayat dan rekap arisan yang dilihat admin.",
    ],
  },
  {
    title: "Permintaan dari admin",
    paragraphs: [
      "Admin dapat meminta penghapusan sebuah grup arisan yang dikelolanya. Permintaan ini dapat mencakup keanggotaan, periode, status pembayaran, gambar bukti, dan rekap yang terkait dengan grup tersebut.",
      "Sebelum memproses penghapusan grup, kami dapat meminta konfirmasi tambahan karena tindakan ini dapat memengaruhi seluruh anggota dan tidak selalu dapat dipulihkan.",
    ],
  },
  {
    title: "Data yang akan dihapus",
    paragraphs: [
      "Setelah permintaan terverifikasi, MyArisan akan menghapus data akun, keanggotaan, dan bukti pembayaran yang diminta sejauh memungkinkan secara operasional. Sebagian catatan terbatas dapat disimpan sementara apabila diperlukan untuk keamanan, pencegahan penyalahgunaan, pencatatan transaksi paket, penyelesaian sengketa, cadangan sistem, atau kewajiban hukum.",
      "Data pada cadangan sistem dapat memerlukan waktu tambahan untuk terhapus sepenuhnya dan tidak akan digunakan kembali untuk operasional normal.",
    ],
  },
  {
    title: "Waktu dan konfirmasi",
    paragraphs: [
      "Kami akan meninjau permintaan dan memberikan pembaruan melalui email. Waktu pemrosesan bergantung pada ruang lingkup permintaan dan kebutuhan verifikasi.",
      "Setelah proses selesai, kami akan mengirim konfirmasi ke alamat email pemohon. Untuk pertanyaan lanjutan, hubungi aldiirawan240703@gmail.com.",
    ],
  },
];

export default function DataDeletionPage() {
  return (
    <LegalPage
      eyebrow="Kontrol data"
      intro="Langkah untuk meminta penghapusan akun, bukti pembayaran, keanggotaan, atau sebuah grup arisan."
      sections={sections}
      title="Penghapusan Data"
      updatedAt="18 Juni 2026"
    />
  );
}
