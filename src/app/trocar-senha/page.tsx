"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TrocarSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [senhaConfirm, setSenhaConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!senha || !senhaConfirm) {
      setErro("Preencha os dois campos");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha deve ter no minimo 6 caracteres");
      return;
    }
    if (senha !== senhaConfirm) {
      setErro("As senhas nao conferem");
      return;
    }

    setLoading(true);
    setErro("");

    try {
      const supabase = createClient();

      // Atualizar senha e limpar flag
      const { error } = await supabase.auth.updateUser({
        password: senha,
        data: { senha_temporaria: false },
      });

      if (error) {
        setErro(error.message);
        setLoading(false);
        return;
      }

      // Redirecionar baseado no perfil
      const res = await fetch("/api/me");
      const me = await res.json();

      if (me.perfil === "aluno") {
        router.push("/aluno");
      } else if (me.perfil === "professor") {
        router.push("/professor");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setErro("Erro: " + err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-gold.png"
            alt="Gold Lion Team"
            width={100}
            height={100}
            className="mx-auto mb-4 rounded-full border-2 border-gold"
          />
          <h1 className="text-2xl font-black text-gold">Trocar Senha</h1>
          <p className="text-gray-400 text-sm mt-1">
            Sua senha e temporaria. Crie uma nova senha para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <div className="bg-danger/20 border border-danger/30 rounded-lg p-3">
              <p className="text-danger text-sm">{erro}</p>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Nova senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-dark-light border border-gray-700 text-white focus:border-gold focus:outline-none"
              placeholder="Min. 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirmar nova senha</label>
            <input
              type="password"
              value={senhaConfirm}
              onChange={(e) => setSenhaConfirm(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-dark-light border border-gray-700 text-white focus:border-gold focus:outline-none"
              placeholder="Repita a senha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gold text-black font-bold text-lg disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
