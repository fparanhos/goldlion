"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { alunos as mockAlunos } from "@/lib/mock-data";
import { nomeModalidade, corModalidade, corStatus } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import type { Modalidade } from "@/types";

export default function AlunosPage() {
  const [busca, setBusca] = useState("");
  const [filtroModalidade, setFiltroModalidade] = useState<Modalidade | "todas">("todas");
  const [alunos, setAlunos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlunos() {
      try {
        const supabase = createClient();
        let query = supabase
          .from("alunos")
          .select("*, perfis!inner(nome, email, telefone, foto_url)")
          .order("perfis(nome)");

        if (filtroModalidade !== "todas") {
          query = query.contains("modalidades", [filtroModalidade]);
        }

        const { data, error } = await query;
        if (error) throw error;
        setAlunos(data || []);
      } catch {
        // Fallback para mock
        const filtered = filtroModalidade === "todas"
          ? mockAlunos
          : mockAlunos.filter((a) => a.modalidades.includes(filtroModalidade));
        setAlunos(
          filtered.map((a) => ({
            ...a,
            perfis: { nome: a.nome, email: a.email, telefone: a.telefone },
          }))
        );
      }
      setLoading(false);
    }

    fetchAlunos();
  }, [filtroModalidade]);

  const alunosFiltrados = busca
    ? alunos.filter((a: any) => {
        const nome = a.perfis?.nome || a.nome || "";
        return nome.toLowerCase().includes(busca.toLowerCase());
      })
    : alunos;

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

      <p className="text-xs text-gray-500">
        {loading ? "Carregando..." : `${alunosFiltrados.length} aluno(s)`}
      </p>

      <div className="space-y-2">
        {alunosFiltrados.map((aluno: any) => {
          const nome = aluno.perfis?.nome || aluno.nome;
          const telefone = aluno.perfis?.telefone || aluno.telefone;
          const iniciais = nome
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
                {aluno.modalidades.map((mod: Modalidade) => (
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
      </div>

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
