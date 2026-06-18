import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Kebijakan Privasi MyArisan mengenai pengumpulan, penggunaan, perlindungan, dan penghapusan data pengguna.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Kebijakan Privasi | MyArisan",
    description:
      "Informasi tentang cara MyArisan mengelola data untuk pencatatan dan rekap arisan.",
    url: "/privacy",
  },
};

const sections = [
  {
    title: "Tentang kebijakan ini",
    paragraphs: [
      "Kebijakan Privasi ini menjelaskan bagaimana MyArisan mengumpulkan, menggunakan, menyimpan, dan melindungi data ketika pengguna memakai bot WhatsApp dan dashboard MyArisan.",
      "Dengan menggunakan MyArisan, pengguna memahami bahwa data tertentu diperlukan agar pencatatan bukti setoran, status pembayaran, keanggotaan, dan rekap arisan dapat berfungsi.",
    ],
  },
  {
    title: "Data yang kami kumpulkan",
    items: [
      "Nomor telepon atau nomor WhatsApp yang digunakan untuk akun dan komunikasi dengan bot.",
      "Nama atau nama tampilan yang diberikan pengguna.",
      "Informasi keanggotaan arisan, termasuk nama arisan, peran admin atau anggota, dan periode arisan.",
      "Gambar bukti pembayaran yang dikirim melalui MyArisan atau diunggah ke dashboard.",
      "Informasi status pembayaran, seperti Menunggu Dicek, Sudah Bayar, atau ditolak.",
      "Catatan penggunaan dan log teknis yang diperlukan untuk keamanan, perbaikan layanan, dan penanganan masalah.",
      "Informasi paket dan bukti pembayaran paket apabila admin menggunakan layanan berbayar.",
    ],
  },
  {
    title: "Cara data digunakan",
    items: [
      "Menyediakan pencatatan arisan, pelacakan status pembayaran, dan pembuatan rekap.",
      "Membantu membaca informasi dari bukti setoran agar dapat ditinjau oleh admin.",
      "Memungkinkan admin menerima atau menolak bukti pembayaran anggota.",
      "Mengelola akses akun, keanggotaan, batas penggunaan, paket, dan langganan.",
      "Menjaga keamanan layanan, mencegah penyalahgunaan, dan memperbaiki pengalaman pengguna.",
      "Menanggapi pertanyaan, permintaan dukungan, atau permintaan penghapusan data.",
    ],
  },
  {
    title: "Bukti pembayaran dan akses data",
    paragraphs: [
      "Bukti pembayaran hanya digunakan untuk membantu pencatatan setoran arisan. Bukti dapat dilihat oleh pengguna yang mengirimkannya dan admin arisan yang berwenang untuk melakukan pemeriksaan. Anggota tidak diberi akses untuk melihat bukti pembayaran milik anggota lain.",
      "Pembacaan otomatis atas bukti bukan keputusan akhir. Setiap bukti tetap masuk ke status Menunggu Dicek dan admin bertanggung jawab untuk menerima atau menolaknya.",
    ],
  },
  {
    title: "Dana arisan",
    paragraphs: [
      "MyArisan tidak memegang, menerima, menyimpan, atau memindahkan dana arisan. Pembayaran anggota dilakukan langsung ke rekening bank atau e-wallet yang ditentukan oleh admin arisan.",
      "MyArisan bukan bank, penyelenggara transfer dana, payment gateway, atau layanan escrow. Tanggung jawab atas penerimaan dan pengelolaan dana tetap berada pada admin serta anggota arisan terkait.",
    ],
  },
  {
    title: "Pembagian dan penjualan data",
    paragraphs: [
      "MyArisan tidak menjual data pribadi pengguna. Data hanya dibagikan kepada penyedia layanan yang diperlukan untuk mengoperasikan MyArisan, sejauh dibutuhkan untuk fungsi seperti penyimpanan, hosting, pemrosesan bukti, atau komunikasi layanan.",
      "Kami juga dapat mengungkapkan data apabila diwajibkan oleh hukum atau diperlukan untuk melindungi keamanan pengguna dan layanan.",
    ],
  },
  {
    title: "Penyimpanan dan keamanan",
    paragraphs: [
      "Kami menerapkan langkah pengamanan yang wajar untuk membatasi akses tidak sah, kehilangan, perubahan, atau penyalahgunaan data. Namun, tidak ada sistem elektronik yang dapat dijamin sepenuhnya bebas risiko.",
      "Data disimpan selama masih dibutuhkan untuk menyediakan layanan, memenuhi kewajiban operasional atau hukum, menyelesaikan sengketa, dan menjaga keamanan sistem.",
    ],
  },
  {
    title: "Hak dan penghapusan data",
    paragraphs: [
      "Pengguna dapat meminta informasi, koreksi, atau penghapusan data akun dengan mengikuti petunjuk pada halaman Data Deletion. Admin juga dapat meminta penghapusan sebuah arisan beserta data terkait, dengan mempertimbangkan kebutuhan operasional dan hukum yang berlaku.",
    ],
  },
  {
    title: "Perubahan kebijakan dan kontak",
    paragraphs: [
      "Kebijakan ini dapat diperbarui seiring perkembangan MyArisan. Perubahan penting akan ditampilkan pada halaman ini dengan tanggal pembaruan terbaru.",
      "Untuk pertanyaan privasi atau permintaan terkait data, hubungi aldiirawan240703@gmail.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      intro="Cara MyArisan menggunakan dan melindungi data yang diperlukan untuk pencatatan arisan."
      sections={sections}
      title="Kebijakan Privasi"
      updatedAt="18 Juni 2026"
    />
  );
}
