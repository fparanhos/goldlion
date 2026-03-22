"use client";

import { useState, useEffect } from "react";
import { nomeModalidade, corModalidade } from "@/lib/utils";

export default function ProfessoresPage() {
  const [professores, setProfessores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "goldlion123",
    telefone: "",
    modalidades: [] as string[],
  });

  async function fetchProfessores() {
    try {
      const res = await fetch("/api/professores");
      const data = await res.json();
      if (Array.isArray(data)) setProfessores(data);
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { fetchProfessores(); }, []);

  function toggleModalidade(mod: string) {
    setForm((prev) => ({
      ...prev,
      modalidades: prev.modalidades.includes(mod)
        ? prev.modalidades.filter((m) => m !== mod)
        : [...prev.modalidades, mod],
    }));
  }

  function iniciarEdicao(prof: any) {
    setForm({
      nome: prof.nome,
      email: prof.email,
      senha: "",
      telefone: prof.telefone || "",
      modalidades: prof.modalidades || [],
    });
    setEditando(prof.id);
    setShowForm(true);
    setErro("");
  }

  function cancelar() {
    setForm({ nome: "", email: "", senha: "goldlion123", telefone: "", modalidades: [] });
    setEditando(null);
    setShowForm(false);
    setErro("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editando) {
      if (!form.nome) { setErro("Nome obrigatorio"); return; }
      setFormLoading(true);
      setErro("");
      try {
        const res = await fetch("/api/professores", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editando, nome: form.nome, telefone: form.telefone }),
        });
        const data = await res.json();
        if (!res.ok) { setErro(data.error || "Erro ao salvar"); setFormLoading(false); return; }
        cancelar();
        fetchProfessores();
      } catch (err: any) { setErro("Erro: " + err.message); }
      setFormLoading(false);
      return;
    }

    if (!form.nome || !form.email || form.modalidades.length === 0) {
      setErro("Preencha nome, email e selecione ao menos uma modalidade");
      return;
    }

    setFormLoading(true);
    setErro("");

    try {
      const res = await fetch("/api/professores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Erro ao cadastrar professor"); setFormLoading(false); return; }
      cancelar();
      fetchProfessores();
    } catch (err: any) { setErro("Erro: " + err.message); }
    setFormLoading(false);
  }

  const diasSemana: Record<number, string> = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sab" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {loading ? "Carregando..." : `${professores.length} professor(es)`}
        </p>
        <button
          onClick={() => showForm ? cancelar() : setShowForm(true)}
          className="px-4 py-2 rounded-lg bg-gold text-black text-sm font-medium"
        >
          {showForm ? "Cancelar" : "+ Novo Professor"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-dark-light rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gold">
            {editando ? "Editar Professor" : "Novo Professor"}
          </h3>
          {erro && (
            <div className="bg-danger/20 border border-danger/30 rounded-lg p-2">
              <p className="text-danger text-xs">{erro}</p>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="input-field"
              placeholder="Nome do professor"
            />
          </div>
          {!editando && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field"
                    placeholder="professor@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Senha inicial</label>
                  <input
                    type="text"
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                    className="input-field"
                    placeholder="goldlion123"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Modalidades *</label>
                <div className="flex gap-2">
                  {(["muaythai", "boxe", "jiujitsu"] as const).map((mod) => (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => toggleModalidade(mod)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        form.modalidades.includes(mod)
                          ? "bg-gold text-black"
                          : "bg-dark text-gray-400 border border-gray-700"
                      }`}
                    >
                      {nomeModalidade(mod)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Telefone</label>
            <input
              type="tel"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              className="input-field"
              placeholder="(11) 99999-0000"
            />
          </div>
          <button
            type="submit"
            disabled={formLoading}
            className="w-full py-3 rounded-lg bg-gold text-black font-bold disabled:opacity-50"
          >
            {formLoading ? "Salvando..." : editando ? "Salvar Alteracoes" : "Cadastrar Professor"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {professores.map((prof: any) => (
          <div key={prof.id} className="bg-dark-light rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gold-dark flex items-center justify-center text-sm font-bold text-white">
                {prof.nome.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{prof.nome}</p>
                <p className="text-xs text-gray-400">{prof.email}</p>
                {prof.telefone && <p className="text-xs text-gray-400">{prof.telefone}</p>}
              </div>
              <button
                onClick={() => iniciarEdicao(prof)}
                className="px-3 py-1.5 rounded-lg text-xs bg-dark text-gold border border-gold/30"
              >
                Editar
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(prof.modalidades || []).map((mod: any) => (
                <span key={mod} className={`px-2 py-0.5 rounded text-xs text-white ${corModalidade(mod as any)}`}>
                  {nomeModalidade(mod as any)}
                </span>
              ))}
            </div>
            {prof.aulas && prof.aulas.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase">Grade Horaria</p>
                {prof.aulas.map((aula: any) => (
                  <div key={aula.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">
                      {diasSemana[aula.dia_semana]} - {nomeModalidade(aula.modalidade)}
                    </span>
                    <span className="text-gold font-mono text-xs">
                      {aula.hora_inicio?.slice(0, 5)} - {aula.hora_fim?.slice(0, 5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
