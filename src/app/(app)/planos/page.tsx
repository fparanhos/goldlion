"use client";

import { useState, useEffect } from "react";
import { nomeModalidade } from "@/lib/utils";

const TIPOS = [
  { value: "diaria", label: "Diaria" },
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

const MODALIDADES = ["muaythai", "boxe", "jiujitsu"] as const;

export default function PlanosPage() {
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({
    nome: "",
    tipo: "mensal",
    modalidades: [] as string[],
    valor: "",
  });

  async function fetchPlanos() {
    try {
      const res = await fetch("/api/planos");
      const data = await res.json();
      if (Array.isArray(data)) setPlanos(data);
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { fetchPlanos(); }, []);

  function toggleModalidade(mod: string) {
    setForm((prev) => ({
      ...prev,
      modalidades: prev.modalidades.includes(mod)
        ? prev.modalidades.filter((m) => m !== mod)
        : [...prev.modalidades, mod],
    }));
  }

  function iniciarEdicao(plano: any) {
    setForm({
      nome: plano.nome,
      tipo: plano.tipo,
      modalidades: plano.modalidades || [],
      valor: String(plano.valor),
    });
    setEditando(plano.id);
    setShowForm(true);
    setErro("");
  }

  function cancelar() {
    setForm({ nome: "", tipo: "mensal", modalidades: [], valor: "" });
    setEditando(null);
    setShowForm(false);
    setErro("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.tipo || form.modalidades.length === 0 || !form.valor) {
      setErro("Preencha todos os campos");
      return;
    }

    setFormLoading(true);
    setErro("");

    try {
      const method = editando ? "PUT" : "POST";
      const body = editando ? { id: editando, ...form } : form;

      const res = await fetch("/api/planos", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Erro ao salvar plano");
        setFormLoading(false);
        return;
      }

      cancelar();
      fetchPlanos();
    } catch (err: any) {
      setErro("Erro: " + err.message);
    }
    setFormLoading(false);
  }

  async function toggleAtivo(plano: any) {
    try {
      await fetch("/api/planos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: plano.id, ativo: !plano.ativo }),
      });
      fetchPlanos();
    } catch { /* */ }
  }

  const tipoLabel: Record<string, string> = {
    diaria: "Diaria",
    mensal: "Mensal",
    trimestral: "Trimestral",
    semestral: "Semestral",
    anual: "Anual",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {loading ? "Carregando..." : `${planos.length} plano(s)`}
        </p>
        <button
          onClick={() => showForm ? cancelar() : setShowForm(true)}
          className="px-4 py-2 rounded-lg bg-gold text-black text-sm font-medium"
        >
          {showForm ? "Cancelar" : "+ Novo Plano"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-dark-light rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gold">
            {editando ? "Editar Plano" : "Novo Plano"}
          </h3>

          {erro && (
            <div className="bg-danger/20 border border-danger/30 rounded-lg p-2">
              <p className="text-danger text-xs">{erro}</p>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1">Nome do Plano *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="input-field"
              placeholder="Ex: Muay Thai Mensal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo *</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="input-field"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                className="input-field"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Modalidades *</label>
            <div className="flex gap-2">
              {MODALIDADES.map((mod) => (
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

          <button
            type="submit"
            disabled={formLoading}
            className="w-full py-3 rounded-lg bg-gold text-black font-bold disabled:opacity-50"
          >
            {formLoading ? "Salvando..." : editando ? "Salvar Alteracoes" : "Criar Plano"}
          </button>
        </form>
      )}

      {/* Lista de planos */}
      <div className="space-y-3">
        {planos.map((plano) => (
          <div
            key={plano.id}
            className={`bg-dark-light rounded-xl p-4 space-y-3 ${!plano.ativo ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{plano.nome}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded text-xs bg-gold/20 text-gold">
                    {tipoLabel[plano.tipo] || plano.tipo}
                  </span>
                  {!plano.ativo && (
                    <span className="px-2 py-0.5 rounded text-xs bg-danger/20 text-danger">
                      Inativo
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gold font-bold text-lg">
                R$ {Number(plano.valor).toFixed(2)}
              </p>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {(plano.modalidades || []).map((mod: any) => (
                <span key={mod} className="px-2 py-0.5 rounded text-xs bg-dark text-gray-300">
                  {nomeModalidade(mod as any)}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => iniciarEdicao(plano)}
                className="flex-1 py-2 rounded-lg bg-dark text-gold text-sm font-medium border border-gold/30"
              >
                Editar
              </button>
              <button
                onClick={() => toggleAtivo(plano)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  plano.ativo
                    ? "bg-danger/20 text-danger border border-danger/30"
                    : "bg-success/20 text-success border border-success/30"
                }`}
              >
                {plano.ativo ? "Desativar" : "Ativar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
