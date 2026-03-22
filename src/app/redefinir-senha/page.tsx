"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [senhaConfirm, setSenhaConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    // Supabase processa o token do hash automaticamente ao carregar a pagina
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // Usuario autenticado via link de recuperacao
      }
    });
  }, []);

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
      const { error } = await supabase.auth.updateUser({ password: senha });

      if (error) {
        setErro(error.message);
        setLoading(false);
        return;
      }

      setSucesso(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err: any) {
      setErro("Erro: " + err.message);
      setLoading(false);
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-success">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Senha redefinida!</h2>
          <p className="text-gray-400 text-sm">Redirecionando para o login...</p>
        </div>
      </div>
    );
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
          <h1 className="text-2xl font-black text-gold">Nova Senha</h1>
          <p className="text-gray-400 text-sm mt-1">Digite sua nova senha</p>
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
            {loading ? "Salvando..." : "Redefinir senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
