"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setErro("Digite seu email");
      return;
    }

    setLoading(true);
    setErro("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) {
        setErro(error.message);
        setLoading(false);
        return;
      }

      setEnviado(true);
    } catch (err: any) {
      setErro("Erro ao enviar email: " + err.message);
    }
    setLoading(false);
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
          <h1 className="text-2xl font-black text-gold">Recuperar Senha</h1>
          <p className="text-gray-400 text-sm mt-1">
            Digite seu email para receber o link de redefinicao
          </p>
        </div>

        {enviado ? (
          <div className="space-y-4">
            <div className="bg-success/10 border border-success/30 rounded-xl p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6 text-success">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <p className="text-success font-medium">Email enviado!</p>
              <p className="text-gray-400 text-sm mt-1">
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </p>
            </div>
            <Link
              href="/"
              className="block w-full py-3 rounded-lg border border-gold text-gold font-bold text-center"
            >
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {erro && (
              <div className="bg-danger/20 border border-danger/30 rounded-lg p-3">
                <p className="text-danger text-sm">{erro}</p>
              </div>
            )}

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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gold text-black font-bold text-lg disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar link de recuperacao"}
            </button>

            <Link
              href="/"
              className="block text-center text-sm text-gray-400 hover:text-gold"
            >
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
