"use client";

import { useState } from "react";
import { useModalidades, type Modalidade } from "@/lib/modalidades/ModalidadesProvider";

const CORES = [
  "bg-red-600",
  "bg-blue-600",
  "bg-purple-600",
  "bg-green-600",
  "bg-yellow-500",
  "bg-pink-600",
  "bg-orange-600",
  "bg-cyan-600",
];

function previewSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 32);
}

export default function ModalidadesPage() {
  const { modalidades, loading, refresh } = useModalidades();
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({
    nome: "",
    cor: CORES[0],
    ordem: 0,
  });

  function iniciarEdicao(m: Modalidade) {
    setForm({ nome: m.nome, cor: m.cor, ordem: m.ordem });
    setEditando(m.slug);
    setShowForm(true);
    setErro("");
  }

  function cancelar() {
    setForm({ nome: "", cor: CORES[0], ordem: 0 });
    setEditando(null);
    setShowForm(false);
    setErro("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || form.nome.trim().length < 2) {
      setErro("Informe um nome com pelo menos 2 caracteres");
      return;
    }
    if (!editando && !previewSlug(form.nome)) {
      setErro("O nome precisa ter letras ou numeros");
      return;
    }
    setFormLoading(true);
    setErro("");
    try {
      const method = editando ? "PUT" : "POST";
      const body = editando
        ? { slug: editando, nome: form.nome.trim(), cor: form.cor, ordem: form.ordem }
        : { nome: form.nome.trim(), cor: form.cor, ordem: form.ordem };
      const res = await fetch("/api/modalidades", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Erro ao salvar modalidade");
        setFormLoading(false);
        return;
      }
      cancelar();
      await refresh();
    } catch (err: unknown) {
      setErro("Erro: " + (err instanceof Error ? err.message : String(err)));
    }
    setFormLoading(false);
  }

  async function toggleAtivo(m: Modalidade) {
    try {
      await fetch("/api/modalidades", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: m.slug, ativo: !m.ativo }),
      });
      await refresh();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {loading ? "Carregando..." : `${modalidades.length} modalidade(s)`}
        </p>
        <button
          onClick={() => (showForm ? cancelar() : setShowForm(true))}
          className="px-4 py-2 rounded-lg bg-gold text-black text-sm font-medium"
        >
          {showForm ? "Cancelar" : "+ Nova Modalidade"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-dark-light rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gold">
            {editando ? "Editar Modalidade" : "Nova Modalidade"}
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
              placeholder="Ex: Karate"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Slug {editando ? "(imutavel)" : "(gerado automaticamente)"}
            </label>
            <input
              type="text"
              value={editando ?? previewSlug(form.nome)}
              disabled
              className="input-field opacity-60 cursor-not-allowed"
              placeholder="(gerado a partir do nome)"
            />
            <p className="text-xs text-gray-500 mt-1">
              O slug e travado apos a criacao para preservar o historico.
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Cor *</label>
            <div className="grid grid-cols-4 gap-2">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, cor: c })}
                  className={`h-10 rounded-lg ${c} border-2 ${
                    form.cor === c ? "border-gold" : "border-transparent"
                  }`}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Ordem</label>
            <input
              type="number"
              value={form.ordem}
              onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) || 0 })}
              className="input-field"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Menor numero aparece antes na lista.
            </p>
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="w-full py-3 rounded-lg bg-gold text-black font-bold disabled:opacity-50"
          >
            {formLoading ? "Salvando..." : editando ? "Salvar Alteracoes" : "Criar Modalidade"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {modalidades.map((m) => (
          <div
            key={m.slug}
            className={`bg-dark-light rounded-xl p-4 space-y-3 ${!m.ativo ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white ${m.cor}`}>
                  {m.nome}
                </span>
                <p className="text-xs text-gray-500">slug: {m.slug}</p>
              </div>
              {!m.ativo && (
                <span className="px-2 py-0.5 rounded text-xs bg-danger/20 text-danger">
                  Inativa
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => iniciarEdicao(m)}
                className="flex-1 py-2 rounded-lg bg-dark text-gold text-sm font-medium border border-gold/30"
              >
                Editar
              </button>
              <button
                onClick={() => toggleAtivo(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  m.ativo
                    ? "bg-danger/20 text-danger border border-danger/30"
                    : "bg-success/20 text-success border border-success/30"
                }`}
              >
                {m.ativo ? "Desativar" : "Ativar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
