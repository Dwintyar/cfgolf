import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="bottom-nav-safe max-w-2xl mx-auto">
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold">Kebijakan Privasi</h1>
      </div>

      <div className="p-6 space-y-6 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">
            Berlaku sejak: 17 Maret 2026
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold text-base">1. Data yang Kami Kumpulkan</h2>
          <p className="text-muted-foreground leading-relaxed">
            GolfBuana mengumpulkan informasi yang Anda berikan saat mendaftar,
            termasuk nama, alamat email, lokasi, dan data aktivitas golf seperti
            skor, handicap, dan partisipasi tournament. Data ini diperlukan untuk
            menjalankan layanan platform komunitas golf.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold text-base">2. Penggunaan Data</h2>
          <p className="text-muted-foreground leading-relaxed">
            Data Anda digunakan untuk:
          </p>
          <ul className="text-muted-foreground space-y-1 ml-4 list-disc">
            <li>Mengelola akun dan profil golfer Anda</li>
            <li>Menampilkan leaderboard dan statistik tournament</li>
            <li>Menghitung dan memperbarui handicap</li>
            <li>Memfasilitasi koneksi antar anggota komunitas golf</li>
            <li>Mengirimkan notifikasi terkait aktivitas klub dan tournament</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold text-base">3. Keamanan Data</h2>
          <p className="text-muted-foreground leading-relaxed">
            Data Anda disimpan secara aman menggunakan layanan Supabase
            dengan enkripsi standar industri. Kami tidak menjual atau
            membagikan data pribadi Anda kepada pihak ketiga tanpa izin
            Anda, kecuali diwajibkan oleh hukum yang berlaku di Indonesia.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold text-base">4. Hak Pengguna</h2>
          <p className="text-muted-foreground leading-relaxed">
            Anda berhak untuk mengakses, memperbarui, atau menghapus data
            pribadi Anda kapan saja melalui halaman Settings di aplikasi.
            Untuk penghapusan akun permanen, hubungi admin platform.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold text-base">5. Kontak</h2>
          <p className="text-muted-foreground leading-relaxed">
            Untuk pertanyaan atau keberatan terkait kebijakan privasi ini,
            silakan hubungi administrator melalui fitur pesan di dalam aplikasi
            atau melalui halaman profil admin GolfBuana.
          </p>
        </div>

        <div className="golf-card p-4 text-center">
          <p className="text-xs text-muted-foreground">
            GolfBuana adalah platform golf komunitas Indonesia
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            © 2026 GolfBuana. Hak cipta dilindungi.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
