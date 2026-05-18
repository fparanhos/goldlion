"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { corStatus } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import { useModalidades } from "@/lib/modalidades/ModalidadesProvider";

const POR_PAGINA = 20;

export default function AlunosPage() {
  const { modalidadesAtivas, byMap } = useModalidades();
  const [busca, setBusca] = useState("");
  const [filtroModalidade, setFiltroModalidade] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [alunos, setAlunos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(0);
  const [total, setTotal] = useState(0);
  const [pendentesCount, setPendentesCount] = useState(0);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);

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

  async function alterarStatusAluno(alunoId: string, novoStatus: string) {
    setAcaoEmAndamento(alunoId);
    try {
      const res = await fetch(`/api/alunos/${alunoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert("Erro: " + (data.error || "Falha ao alterar status"));
        return;
      }
      setAlunos((prev) =>
        prev.map((a) => (a.id === alunoId ? { ...a, status: novoStatus } : a))
      );
      setMenuAberto(null);
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
    setAcaoEmAndamento(null);
  }

  async function excluirAluno(alunoId: string, nome: string) {
    const ok = confirm(
      `EXCLUIR DEFINITIVAMENTE "${nome}"?\n\n` +
      `Remove o aluno, pagamentos e check-ins. Acao irreversivel.\n` +
      `Para apenas desativar, use Desativar.`
    );
    if (!ok) return;
    setAcaoEmAndamento(alunoId);
    try {
      const res = await fetch(`/api/alunos/${alunoId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert("Erro: " + (data.error || "Falha ao excluir"));
        return;
      }
      setAlunos((prev) => prev.filter((a) => a.id !== alunoId));
      setTotal((t) => Math.max(0, t - 1));
      setMenuAberto(null);
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
    setAcaoEmAndamento(null);
  }

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
        {["todas", ...modalidadesAtivas.map((m) => m.slug)].map((mod) => (
          <button
            key={mod}
            onClick={() => setFiltroModalidade(mod)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filtroModalidade === mod ? "bg-gold text-black" : "bg-dark-light text-gray-400"
            }`}
          >
            {mod === "todas" ? "Todas" : byMap[mod]?.nome ?? mod}
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

          const menuOpen = menuAberto === aluno.id;
          const isLoading = acaoEmAndamento === aluno.id;

          return (
            <div key={aluno.id} className="bg-dark-light rounded-lg overflow-hidden">
              <div className="flex">
                <Link
                  href={`/alunos/${aluno.id}`}
                  className="flex-1 p-4 active:bg-dark-lighter transition-colors"
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
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {(aluno.modalidades || []).map((mod: string) => (
                      <span key={mod} className={`px-2 py-0.5 rounded text-xs text-white ${byMap[mod]?.cor ?? "bg-gray-600"}`}>
                        {byMap[mod]?.nome ?? mod}
                      </span>
                    ))}
                    {aluno.faixa && (
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                        Faixa {aluno.faixa}
                      </span>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => setMenuAberto(menuOpen ? null : aluno.id)}
                  disabled={isLoading}
                  className="w-10 flex items-center justify-center text-gray-400 active:text-gold disabled:opacity-50"
                  aria-label="Acoes do aluno"
                >
                  {isLoading ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 animate-spin">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M12 6.75a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 13.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 20.25a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                    </svg>
                  )}
                </button>
              </div>
              {menuOpen && (
                <div className="border-t border-gray-800 bg-dark p-2 flex flex-wrap gap-2">
                  <Link
                    href={`/alunos/${aluno.id}`}
                    className="px-3 py-1.5 rounded text-xs bg-dark-light text-gold border border-gold/30"
                    onClick={() => setMenuAberto(null)}
                  >
                    Abrir
                  </Link>
                  {aluno.status === "cancelado" ? (
                    <button
                      onClick={() => alterarStatusAluno(aluno.id, "ativo")}
                      className="px-3 py-1.5 rounded text-xs bg-dark-light text-success border border-success/30"
                    >
                      Reativar
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (confirm(`Desativar "${nome}"? O cadastro e mantido.`)) alterarStatusAluno(aluno.id, "cancelado");
                      }}
                      className="px-3 py-1.5 rounded text-xs bg-dark-light text-warning border border-warning/30"
                    >
                      Desativar
                    </button>
                  )}
                  {aluno.status === "pendente" && (
                    <button
                      onClick={() => alterarStatusAluno(aluno.id, "ativo")}
                      className="px-3 py-1.5 rounded text-xs bg-dark-light text-success border border-success/30"
                    >
                      Aprovar
                    </button>
                  )}
                  <button
                    onClick={() => excluirAluno(aluno.id, nome)}
                    className="px-3 py-1.5 rounded text-xs bg-dark-light text-danger border border-danger/30"
                  >
                    Excluir
                  </button>
                  <button
                    onClick={() => setMenuAberto(null)}
                    className="ml-auto px-3 py-1.5 rounded text-xs text-gray-400"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
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
