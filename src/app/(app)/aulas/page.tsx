"use client";

import { useState, useEffect } from "react";
import { nomeModalidade, corModalidade } from "@/lib/utils";

const DIAS: Record<number, string> = { 0: "Domingo", 1: "Segunda", 2: "Terca", 3: "Quarta", 4: "Quinta", 5: "Sexta", 6: "Sabado" };
const DIAS_CURTO: Record<number, string> = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sab" };
const MODALIDADES = ["muaythai", "boxe", "jiujitsu"] as const;

export default function AulasPage() {
  const [aulas, setAulas] = useState<any[]>([]);
  const [professores, setProfessores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [filtroDia, setFiltroDia] = useState<number | "todos">("todos");
  const [form, setForm] = useState({
    modalidade: "muaythai",
    professor_id: "",
    dia_semana: "1",
    hora_inicio: "07:00",
    hora_fim: "08:30",
    vagas: "20",
  });

  async function fetchAulas() {
    try {
      const res = await fetch("/api/aulas");
      const data = await res.json();
      if (Array.isArray(data)) setAulas(data);
    } catch { /* */ }
    setLoading(false);
  }

  async function fetchProfessores() {
    try {
      const res = await fetch("/api/professores");
      const data = await res.json();
      if (Array.isArray(data)) setProfessores(data);
    } catch { /* */ }
  }

  useEffect(() => {
    fetchAulas();
    fetchProfessores();
  }, []);

  function iniciarEdicao(aula: any) {
    setForm({
      modalidade: aula.modalidade,
      professor_id: aula.professor_id,
      dia_semana: String(aula.dia_semana),
      hora_inicio: aula.hora_inicio?.slice(0, 5) || "07:00",
      hora_fim: aula.hora_fim?.slice(0, 5) || "08:30",
      vagas: String(aula.vagas || 20),
    });
    setEditando(aula.id);
    setShowForm(true);
    setErro("");
  }

  function cancelar() {
    setForm({ modalidade: "muaythai", professor_id: "", dia_semana: "1", hora_inicio: "07:00", hora_fim: "08:30", vagas: "20" });
    setEditando(null);
    setShowForm(false);
    setErro("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.professor_id || !form.modalidade) {
      setErro("Selecione professor e modalidade");
      return;
    }

    setFormLoading(true);
    setErro("");

    try {
      const method = editando ? "PUT" : "POST";
      const body = editando ? { id: editando, ...form } : form;

      const res = await fetch("/api/aulas", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Erro ao salvar"); setFormLoading(false); return; }

      cancelar();
      fetchAulas();
    } catch (err: any) { setErro("Erro: " + err.message); }
    setFormLoading(false);
  }

  async function removerAula(id: string) {
    if (!confirm("Remover esta aula da grade?")) return;
    try {
      await fetch(`/api/aulas?id=${id}`, { method: "DELETE" });
      fetchAulas();
    } catch { /* */ }
  }

  const aulasFiltradas = filtroDia === "todos"
    ? aulas
    : aulas.filter((a) => a.dia_semana === filtroDia);

  // Agrupar por dia
  const aulasPorDia: Record<number, any[]> = {};
  aulasFiltradas.forEach((a) => {
    if (!aulasPorDia[a.dia_semana]) aulasPorDia[a.dia_semana] = [];
    aulasPorDia[a.dia_semana].push(a);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gold">Grade Horaria</h2>
        <button
          onClick={() => showForm ? cancelar() : setShowForm(true)}
          className="px-4 py-2 rounded-lg bg-gold text-black text-sm font-medium"
        >
          {showForm ? "Cancelar" : "+ Nova Aula"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-dark-light rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gold">
            {editando ? "Editar Aula" : "Nova Aula"}
          </h3>

          {erro && (
            <div className="bg-danger/20 border border-danger/30 rounded-lg p-2">
              <p className="text-danger text-xs">{erro}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Modalidade *</label>
              <select
                value={form.modalidade}
                onChange={(e) => setForm({ ...form, modalidade: e.target.value })}
                className="input-field"
              >
                {MODALIDADES.map((mod) => (
                  <option key={mod} value={mod}>{nomeModalidade(mod)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Dia da Semana *</label>
              <select
                value={form.dia_semana}
                onChange={(e) => setForm({ ...form, dia_semana: e.target.value })}
                className="input-field"
              >
                {Object.entries(DIAS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Professor *</label>
            <select
              value={form.professor_id}
              onChange={(e) => setForm({ ...form, professor_id: e.target.value })}
              className="input-field"
            >
              <option value="">Selecione...</option>
              {professores.map((p: any) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Inicio *</label>
              <input
                type="time"
                value={form.hora_inicio}
                onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Fim *</label>
              <input
                type="time"
                value={form.hora_fim}
                onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Vagas</label>
              <input
                type="number"
                min="1"
                value={form.vagas}
                onChange={(e) => setForm({ ...form, vagas: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="w-full py-3 rounded-lg bg-gold text-black font-bold disabled:opacity-50"
          >
            {formLoading ? "Salvando..." : editando ? "Salvar Alteracoes" : "Criar Aula"}
          </button>
        </form>
      )}

      {/* Filtro por dia */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFiltroDia("todos")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
            filtroDia === "todos" ? "bg-gold text-black" : "bg-dark-light text-gray-400"
          }`}
        >
          Todos
        </button>
        {[1, 2, 3, 4, 5, 6, 0].map((dia) => (
          <button
            key={dia}
            onClick={() => setFiltroDia(dia)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              filtroDia === dia ? "bg-gold text-black" : "bg-dark-light text-gray-400"
            }`}
          >
            {DIAS_CURTO[dia]}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        {loading ? "Carregando..." : `${aulasFiltradas.length} aula(s)`}
      </p>

      {/* Lista agrupada por dia */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6, 0]
          .filter((dia) => aulasPorDia[dia]?.length > 0)
          .map((dia) => (
            <div key={dia}>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {DIAS[dia]}
              </h3>
              <div className="space-y-2">
                {aulasPorDia[dia].map((aula: any) => (
                  <div key={aula.id} className="bg-dark-light rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs text-white ${corModalidade(aula.modalidade)}`}>
                          {nomeModalidade(aula.modalidade)}
                        </span>
                        <span className="text-gold font-mono text-sm font-medium">
                          {aula.hora_inicio?.slice(0, 5)} - {aula.hora_fim?.slice(0, 5)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{aula.vagas} vagas</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">Prof. {aula.professor_nome}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => iniciarEdicao(aula)}
                          className="px-2 py-1 rounded text-xs bg-dark text-gold border border-gold/30"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => removerAula(aula.id)}
                          className="px-2 py-1 rounded text-xs bg-dark text-danger border border-danger/30"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {!loading && aulasFiltradas.length === 0 && (
        <div className="bg-dark-light rounded-xl p-6 text-center">
          <p className="text-gray-500 text-sm">Nenhuma aula cadastrada.</p>
        </div>
      )}
    </div>
  );
}
