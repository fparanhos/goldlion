"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { nomeModalidade, corModalidade, corStatus } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import type { Modalidade } from "@/types";

const POR_PAGINA = 20;

export default function AlunosPage() {
  const [busca, setBusca] = useState("");
  const [filtroModalidade, setFiltroModalidade] = useState<Modalidade | "todas">("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [alunos, setAlunos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(0);
  const [total, setTotal] = useState(0);
  const [pendentesCount, setPendentesCount] = useState(0);

  const fetchAlunos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        pagina: String(pagina),
        porPagina: String(POR_PAGINA),
      });
      if (filtroModalidade !== "todas") params.set("modalidade", filtroModalidade);

      const res = await fetch(`/api/alunos?${params}`);
      const data = await res.json();

      if (data.alunos) {
        setAlunos(data.alunos);
        setTotal(data.total);
        setPendentesCount((data.alunos as any[]).filter((a: any) => a.status === "pendente").length);
      }
    } catch {
      setAlunos([]);
      setTotal(0);
    }
    setLoading(false);
  }, [filtroModalidade, pagina]);

  useEffect(() => {
    fetchAlunos();
  }, [fetchAlunos]);

  useEffect(() => {
    setPagina(0);
  }, [filtroModalidade]);

  const alunosFiltrados = alunos.filter((a: any) => {
    const nome = a.perfis?.nome || a.nome || "";
    const matchBusca = !busca || nome.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || a.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const totalPaginas = Math.ceil(total / POR_PAGINA);

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Buscar aluno..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg bg-dark-light border border-gray-700 text-white text-sm focus:border-gold focus:outline-none"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["todas", "muaythai", "boxe", "jiujitsu"] as const).map((mod) => (
          <button
            key={mod}
            onClick={() => setFiltroModalidade(mod)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filtroModalidade === mod ? "bg-gold text-black" : "bg-dark-light text-gray-400"
            }`}
          >
            {mod === "todas" ? "Todas" : nomeModalidade(mod)}
          </button>
        ))}
      </div>

      {pendentesCount > 0 && (
        <button
          onClick={() => setFiltroStatus(filtroStatus === "pendente" ? "todos" : "pendente")}
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
            filtroStatus === "pendente"
              ? "bg-orange-500 text-white"
              : "bg-orange-500/20 border border-orange-500/40 text-orange-400"
          }`}
        >
          {pendentesCount} cadastro(s) aguardando aprovacao
        </button>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {loading ? "Carregando..." : `${total} aluno(s)`}
        </p>
        {totalPaginas > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              disabled={pagina === 0}
              className="px-2 py-1 rounded text-xs bg-dark-light text-gray-400 disabled:opacity-30"
            >
              Anterior
            </button>
            <span className="text-xs text-gray-400">
              {pagina + 1} / {totalPaginas}
            </span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
              disabled={pagina >= totalPaginas - 1}
              className="px-2 py-1 rounded text-xs bg-dark-light text-gray-400 disabled:opacity-30"
            >
              Proximo
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {alunosFiltrados.map((aluno: any) => {
          const nome = aluno.perfis?.nome || aluno.nome;
          const telefone = aluno.perfis?.telefone || aluno.telefone;
          const iniciais = (nome || "?")
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .slice(0, 2);

          return (
            <Link
              key={aluno.id}
              href={`/alunos/${aluno.id}`}
              className="block bg-dark-light rounded-lg p-4 active:bg-dark-lighter transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold-dark flex items-center justify-center text-sm font-bold text-white">
                    {iniciais}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{nome}</p>
                    <p className="text-xs text-gray-400">{telefone}</p>
                  </div>
                </div>
                <StatusBadge label={aluno.status} colorClass={corStatus(aluno.status)} />
              </div>
              <div className="flex gap-1.5 mt-2">
                {(aluno.modalidades || []).map((mod: Modalidade) => (
                  <span key={mod} className={`px-2 py-0.5 rounded text-xs text-white ${corModalidade(mod)}`}>
                    {nomeModalidade(mod)}
                  </span>
                ))}
                {aluno.faixa && (
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                    Faixa {aluno.faixa}
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        {!loading && alunosFiltrados.length === 0 && (
          <div className="bg-dark-light rounded-xl p-6 text-center">
            <p className="text-gray-500 text-sm">Nenhum aluno encontrado.</p>
          </div>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2 pb-4">
          <button
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
            disabled={pagina === 0}
            className="px-3 py-2 rounded-lg text-sm bg-dark-light text-gray-400 disabled:opacity-30"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-400">
            Pagina {pagina + 1} de {totalPaginas}
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
            disabled={pagina >= totalPaginas - 1}
            className="px-3 py-2 rounded-lg text-sm bg-dark-light text-gray-400 disabled:opacity-30"
          >
            Proximo
          </button>
        </div>
      )}

      <Link
        href="/alunos/novo"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-gold flex items-center justify-center shadow-lg active:bg-gold-dark transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth={3} className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </Link>
    </div>
  );
}
