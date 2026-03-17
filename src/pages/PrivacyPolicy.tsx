import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-1.5 text-muted-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>

        <h1 className="font-display text-2xl font-bold mb-1">
          Kebijakan Privasi CFGolf
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Tanggal efektif: 17 Maret 2026
        </p>

        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Data yang Kami Kumpulkan</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kami mengumpulkan nama, email, dan data aktivitas golf Anda untuk keperluan platform komunitas golf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Penggunaan Data</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Data digunakan untuk mengelola akun, tournament, handicap, dan koneksi antar golfer.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Keamanan Data</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Data disimpan secara aman di server Supabase dengan enkripsi standar industri.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Kontak</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pertanyaan: hubungi admin melalui platform.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
