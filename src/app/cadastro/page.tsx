"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { nomeModalidade } from "@/lib/utils";
import type { Modalidade } from "@/types";

export default function CadastroPage() {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [planos, setPlanos] = useState<any[]>([]);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    senhaConfirm: "",
    telefone: "",
    cpf: "",
    dataNascimento: "",
    contatoEmergencia: "",
    telefoneEmergencia: "",
    modalidades: [] as Modalidade[],
    planoId: "",
  });

  useEffect(() => {
    async function fetchPlanos() {
      try {
        const res = await fetch("/api/planos");
        const data = await res.json();
        if (Array.isArray(data)) setPlanos(data.filter((p: any) => p.ativo));
      } catch { /* */ }
    }
    fetchPlanos();
  }, []);

  function toggleModalidade(mod: Modalidade) {
    setForm((prev) => ({
      ...prev,
      modalidades: prev.modalidades.includes(mod)
        ? prev.modalidades.filter((m) => m !== mod)
        : [...prev.modalidades, mod],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.nome || !form.email || !form.senha || !form.telefone || form.modalidades.length === 0) {
      setErro("Preencha nome, email, senha, telefone e selecione ao menos uma modalidade");
      return;
    }

    if (form.senha.length < 6) {
      setErro("A senha deve ter no minimo 6 caracteres");
      return;
    }

    if (form.senha !== form.senhaConfirm) {
      setErro("As senhas nao conferem");
      return;
    }

    setLoading(true);
    setErro("");

    try {
      const res = await fetch("/api/alunos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          telefone: form.telefone,
          cpf: form.cpf,
          dataNascimento: form.dataNascimento,
          contatoEmergencia: form.contatoEmergencia,
          telefoneEmergencia: form.telefoneEmergencia,
          modalidades: form.modalidades,
          planoId: form.planoId,
          autoCadastro: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao cadastrar");
        setLoading(false);
        return;
      }

      setSucesso(true);
    } catch (err: any) {
      setErro("Erro: " + err.message);
      setLoading(false);
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-orange-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Cadastro enviado!</h2>
          <p className="text-gray-400 text-sm">
            Seu cadastro foi recebido e esta aguardando a aprovacao de um professor.
            Voce recebera acesso assim que for aprovado.
          </p>
          <a
            href="/"
            className="inline-block mt-4 px-6 py-3 rounded-lg bg-gold text-black font-bold text-sm hover:bg-gold-light transition-colors"
          >
            Voltar ao Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-gold.png"
            alt="Gold Lion Team"
            width={80}
            height={80}
            className="mx-auto mb-3 rounded-full border-2 border-gold"
          />
          <h1 className="text-2xl font-black text-gold">Novo Aluno</h1>
          <p className="text-gray-400 text-sm mt-1">Preencha seus dados para se cadastrar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <div className="bg-danger/20 border border-danger/30 rounded-lg p-3">
              <p className="text-danger text-sm">{erro}</p>
            </div>
          )}

          <Field label="Nome completo" required>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="input-field"
              placeholder="Seu nome completo"
            />
          </Field>

          <Field label="Email" required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
              placeholder="seu@email.com"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Senha" required>
              <input
                type="password"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                className="input-field"
                placeholder="Min. 6 caracteres"
              />
            </Field>
            <Field label="Confirmar senha" required>
              <input
                type="password"
                value={form.senhaConfirm}
                onChange={(e) => setForm({ ...form, senhaConfirm: e.target.value })}
                className="input-field"
                placeholder="Repita a senha"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone" required>
              <input
                type="tel"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="input-field"
                placeholder="(11) 99999-0000"
              />
            </Field>
            <Field label="CPF">
              <input
                type="text"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                className="input-field"
                placeholder="000.000.000-00"
              />
            </Field>
          </div>

          <Field label="Data de Nascimento">
            <input
              type="date"
              value={form.dataNascimento}
              onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
              className="input-field"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contato de Emergencia">
              <input
                type="text"
                value={form.contatoEmergencia}
                onChange={(e) => setForm({ ...form, contatoEmergencia: e.target.value })}
                className="input-field"
                placeholder="Nome"
              />
            </Field>
            <Field label="Tel. Emergencia">
              <input
                type="tel"
                value={form.telefoneEmergencia}
                onChange={(e) => setForm({ ...form, telefoneEmergencia: e.target.value })}
                className="input-field"
                placeholder="(11) 99999-0000"
              />
            </Field>
          </div>

          <Field label="Modalidades" required>
            <div className="flex gap-2 flex-wrap">
              {(["muaythai", "boxe", "jiujitsu"] as const).map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => toggleModalidade(mod)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.modalidades.includes(mod)
                      ? "bg-gold text-black"
                      : "bg-dark-light text-gray-400 border border-gray-700"
                  }`}
                >
                  {nomeModalidade(mod)}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Plano desejado">
            <select
              value={form.planoId}
              onChange={(e) => setForm({ ...form, planoId: e.target.value })}
              className="input-field"
            >
              <option value="">Selecione um plano</option>
              {planos.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nome} - R$ {Number(p.valor).toFixed(2)}
                </option>
              ))}
            </select>
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gold text-black font-bold text-lg disabled:opacity-50"
          >
            {loading ? "Cadastrando..." : "Criar Conta"}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Ja tem conta?{" "}
          <Link href="/" className="text-gold font-medium hover:underline">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
