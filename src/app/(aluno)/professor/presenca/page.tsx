"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useModalidades } from "@/lib/modalidades/ModalidadesProvider";

interface AlunoLista {
  id: string;
  modalidades: string[];
  perfis?: { nome?: string; email?: string };
}

export default function ProfessorPresencaPage() {
  const { modalidadesAtivas, byMap } = useModalidades();
  const [modalidadeSel, setModalidadeSel] = useState<string>("");
  const [alunos, setAlunos] = useState<AlunoLista[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [registrando, setRegistrando] = useState<string | null>(null);
  const [registrados, setRegistrados] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    if (!modalidadeSel && modalidadesAtivas.length > 0) {
      setModalidadeSel(modalidadesAtivas[0].slug);
    }
  }, [modalidadesAtivas, modalidadeSel]);

  useEffect(() => {
    async function fetchAlunos() {
      setCarregando(true);
      try {
        const res = await fetch("/api/alunos?porPagina=500");
        const data = await res.json();
        if (Array.isArray(data?.alunos)) setAlunos(data.alunos);
      } catch { /* */ }
      setCarregando(false);
    }
    fetchAlunos();
  }, []);

  const alunosFiltrados = useMemo(() => {
    const buscaLow = busca.trim().toLowerCase();
    return alunos.filter((a) => {
      const temModalidade = !modalidadeSel || (a.modalidades || []).includes(modalidadeSel);
      const nome = (a.perfis?.nome || "").toLowerCase();
      const email = (a.perfis?.email || "").toLowerCase();
      const passaBusca = !buscaLow || nome.includes(buscaLow) || email.includes(buscaLow);
      return temModalidade && passaBusca;
    });
  }, [alunos, modalidadeSel, busca]);

  async function registrarPresenca(aluno: AlunoLista) {
    if (!modalidadeSel) {
      setErro("Selecione uma modalidade");
      return;
    }
    setErro("");
    setSucesso("");
    setRegistrando(aluno.id);
    try {
      const res = await fetch("/api/professor/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alunoId: aluno.id, modalidade: modalidadeSel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Falha ao registrar presenca");
        setRegistrando(null);
        return;
      }
      setRegistrados((prev) => new Set(prev).add(aluno.id));
      setSucesso(`Presenca de ${aluno.perfis?.nome ?? "aluno"} registrada.`);
    } catch (err: any) {
      setErro("Erro: " + err.message);
    }
    setRegistrando(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/professor" className="text-xs text-gray-400 hover:text-gold">
          &larr; Voltar
        </Link>
        <h2 className="text-xl font-bold text-white mt-1">Registrar Presenca</h2>
        <p className="text-sm text-gray-400">
          Use quando o aluno esteve na aula mas nao fez o check-in pelo app.
        </p>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
          Modalidade
        </label>
        <div className="flex gap-2 flex-wrap">
          {modalidadesAtivas.map((mod) => (
            <button
              key={mod.slug}
              onClick={() => setModalidadeSel(mod.slug)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                modalidadeSel === mod.slug
                  ? "bg-gold text-black"
                  : "bg-dark-light text-gray-400 border border-gray-700"
              }`}
            >
              {mod.nome}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
          Buscar aluno
        </label>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome ou email"
          className="w-full px-4 py-3 rounded-lg bg-dark-light border border-gray-700 text-white focus:border-gold focus:outline-none"
        />
      </div>

      {erro && (
        <div className="bg-danger/20 border border-danger/30 rounded-lg p-3">
          <p className="text-danger text-sm">{erro}</p>
        </div>
      )}

      {sucesso && (
        <div className="bg-success/20 border border-success/30 rounded-lg p-3">
          <p className="text-success text-sm">{sucesso}</p>
        </div>
      )}

      <div className="space-y-2">
        {carregando ? (
          <p className="text-gray-400 text-sm text-center py-6">Carregando alunos...</p>
        ) : alunosFiltrados.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">
            Nenhum aluno encontrado{modalidadeSel ? ` em ${byMap[modalidadeSel]?.nome ?? modalidadeSel}` : ""}.
          </p>
        ) : (
          alunosFiltrados.map((aluno) => {
            const jaRegistrado = registrados.has(aluno.id);
            return (
              <div
                key={aluno.id}
                className="bg-dark-light rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gold-dark flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {(aluno.perfis?.nome || "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {aluno.perfis?.nome || "Sem nome"}
                    </p>
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {(aluno.modalidades || []).map((m) => (
                        <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-gold/20 text-gold">
                          {byMap[m]?.nome ?? m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => registrarPresenca(aluno)}
                  disabled={registrando === aluno.id || jaRegistrado}
                  className={`px-3 py-2 rounded-lg text-xs font-medium shrink-0 ${
                    jaRegistrado
                      ? "bg-success/20 text-success border border-success/30"
                      : "bg-gold text-black disabled:opacity-50"
                  }`}
                >
                  {jaRegistrado ? "Registrado" : registrando === aluno.id ? "..." : "Registrar"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
