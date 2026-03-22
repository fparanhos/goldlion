"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, isDemoMode } from "@/lib/supabase/client";
import type { Modalidade, TipoPlano } from "@/types";

export default function NovoAlunoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [planos, setPlanos] = useState<any[]>([]);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "123456",
    telefone: "",
    cpf: "",
    dataNascimento: "",
    contatoEmergencia: "",
    telefoneEmergencia: "",
    modalidades: [] as Modalidade[],
    planoId: "",
    observacoes: "",
  });

  useEffect(() => {
    async function fetchPlanos() {
      try {
        if (isDemoMode) throw new Error("demo");
        const supabase = createClient();
        const { data } = await supabase
          .from("planos")
          .select("*")
          .eq("ativo", true)
          .order("valor");
        if (data) setPlanos(data);
      } catch {
        // Planos mock
        setPlanos([
          { id: "1", nome: "Muay Thai Mensal", valor: 120 },
          { id: "2", nome: "Boxe Mensal", valor: 120 },
          { id: "3", nome: "Jiu-Jitsu Mensal", valor: 150 },
          { id: "4", nome: "Combo 2 Modalidades", valor: 200 },
          { id: "5", nome: "Combo Completo", valor: 280 },
        ]);
      }
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
    if (!form.nome || !form.telefone || form.modalidades.length === 0) {
      setErro("Preencha nome, telefone e selecione ao menos uma modalidade");
      return;
    }

    setLoading(true);
    setErro("");

    try {
      const res = await fetch("/api/alunos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao cadastrar aluno");
        setLoading(false);
        return;
      }

      router.push("/alunos");
    } catch (err: any) {
      setErro("Erro ao cadastrar: " + err.message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {erro && (
        <div className="bg-danger/20 border border-danger/30 rounded-lg p-3">
          <p className="text-danger text-sm">{erro}</p>
        </div>
      )}

      <Field label="Nome completo" required>
        <input
          type="text"
          required
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          className="input-field"
          placeholder="Nome do aluno"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input-field"
            placeholder="email@exemplo.com"
          />
        </Field>
        <Field label="Senha inicial">
          <input
            type="text"
            value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })}
            className="input-field"
            placeholder="123456"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Telefone" required>
          <input
            type="tel"
            required
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

      {/* Modalidades */}
      <Field label="Modalidades" required>
        <div className="flex gap-2">
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
              {mod === "muaythai" ? "Muay Thai" : mod === "boxe" ? "Boxe" : "Jiu-Jitsu"}
            </button>
          ))}
        </div>
      </Field>

      {/* Plano */}
      <Field label="Plano">
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

      <Field label="Observacoes">
        <textarea
          value={form.observacoes}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          className="input-field h-20 resize-none"
          placeholder="Observacoes sobre o aluno..."
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-lg border border-gray-700 text-gray-400 font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-lg bg-gold text-black font-bold disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Cadastrar"}
        </button>
      </div>
    </form>
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
