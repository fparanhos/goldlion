"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfessorPerfilPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        setMe(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Carregando...</p>
      </div>
    );
  }

  if (!me?.perfil) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <p className="text-gray-400">Nao foi possivel carregar seu perfil.</p>
        <Link href="/" className="text-gold underline text-sm">Voltar ao login</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-gold-dark flex items-center justify-center text-lg font-bold text-white">
          {(me.nome || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <p className="text-sm text-gray-400">Meu perfil</p>
          <h2 className="text-xl font-bold text-white">{me.nome}</h2>
        </div>
      </div>

      <div className="bg-dark-light rounded-xl p-4 space-y-3">
        <Linha label="Nome" value={me.nome} />
        <Linha label="Email" value={me.email} />
        <Linha label="Telefone" value={me.telefone || "—"} />
        <Linha label="Tipo de conta" value="Professor" />
      </div>

      <div className="space-y-2">
        <Link
          href="/trocar-senha"
          className="block w-full py-3 rounded-lg border border-gold text-gold font-medium text-center"
        >
          Trocar senha
        </Link>
        <button
          onClick={handleLogout}
          className="block w-full py-3 rounded-lg border border-danger/40 text-danger font-medium"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

function Linha({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-white text-right break-all">{value || "—"}</span>
    </div>
  );
}
