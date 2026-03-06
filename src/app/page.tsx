"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !senha) {
      setErro("Preencha todos os campos");
      return;
    }

    setLoading(true);
    setErro("");

    // Se Supabase nao configurado, modo demo
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    if (!supabaseUrl || supabaseUrl.includes("SEU-PROJETO")) {
      router.push("/dashboard");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        setErro("Email ou senha incorretos");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-gold.jpeg"
            alt="Gold Lion Team"
            width={120}
            height={120}
            className="mx-auto mb-4 rounded-full"
          />
          <h1 className="text-3xl font-black text-gold">GOLD LION</h1>
          <p className="text-gray-400 text-sm mt-1">Team - Sistema de Gestao</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-dark-light border border-gray-700 text-white focus:border-gold focus:outline-none"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-dark-light border border-gray-700 text-white focus:border-gold focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {erro && <p className="text-danger text-sm">{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gold text-black font-bold text-lg hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-8">
          Gold Lion Academy v1.0
        </p>
      </div>
    </div>
  );
}
