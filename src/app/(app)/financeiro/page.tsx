"use client";

import { useState, useEffect } from "react";
import { createClient, isDemoMode } from "@/lib/supabase/client";
import { pagamentos as mockPags, alunos as mockAlunos } from "@/lib/mock-data";
import { formatarMoeda, formatarData, corStatusPagamento } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import type { StatusPagamento } from "@/types";

export default function FinanceiroPage() {
  const [filtro, setFiltro] = useState<StatusPagamento | "todos" | "sinalizados">("todos");
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [resumo, setResumo] = useState({ recebido: 0, pendente: 0, atrasado: 0, sinalizados: 0 });
  const [modalRegistrar, setModalRegistrar] = useState<string | null>(null);
  const [modalComprovante, setModalComprovante] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        if (isDemoMode) throw new Error("demo");
        const supabase = createClient();
        let query = supabase
          .from("pagamentos")
          .select("*, alunos!inner(id, perfis!inner(nome))")
          .order("data_vencimento", { ascending: false });

        if (filtro === "sinalizados") {
          query = query.not("sinalizado_em", "is", null).neq("status", "pago");
        } else if (filtro !== "todos") {
          query = query.eq("status", filtro);
        }

        const { data, error } = await query;
        if (error) throw error;
        setPagamentos(data || []);

        // Resumo
        const { data: todos } = await supabase.from("pagamentos").select("valor, status, sinalizado_em");
        const r = { recebido: 0, pendente: 0, atrasado: 0, sinalizados: 0 };
        todos?.forEach((p) => {
          if (p.status === "pago") r.recebido += Number(p.valor);
          if (p.status === "pendente") r.pendente += Number(p.valor);
          if (p.status === "atrasado") r.atrasado += Number(p.valor);
          if (p.sinalizado_em && p.status !== "pago") r.sinalizados++;
        });
        setResumo(r);
      } catch {
        // Mock
        const pags = filtro === "todos" ? mockPags : mockPags.filter((p) => p.status === filtro);
        setPagamentos(
          pags.map((p) => ({
            ...p,
            alunos: { perfis: { nome: mockAlunos.find((a) => a.id === p.alunoId)?.nome } },
          }))
        );
        setResumo({
          recebido: mockPags.filter((p) => p.status === "pago").reduce((a, p) => a + p.valor, 0),
          pendente: mockPags.filter((p) => p.status === "pendente").reduce((a, p) => a + p.valor, 0),
          atrasado: mockPags.filter((p) => p.status === "atrasado").reduce((a, p) => a + p.valor, 0),
          sinalizados: 0,
        });
      }
      setLoading(false);
    }
    fetchData();
  }, [filtro]);

  async function registrarPagamento(pagId: string, forma: string) {
    try {
      const supabase = createClient();
      await supabase
        .from("pagamentos")
        .update({
          status: "pago",
          data_pagamento: new Date().toISOString().split("T")[0],
          forma_pagamento: forma,
        })
        .eq("id", pagId);
    } catch {
      // mock
    }
    setModalRegistrar(null);
    setPagamentos((prev) =>
      prev.map((p) =>
        p.id === pagId
          ? { ...p, status: "pago", data_pagamento: new Date().toISOString().split("T")[0], forma_pagamento: forma }
          : p
      )
    );
    setResumo((prev) => {
      const pag = pagamentos.find((p) => p.id === pagId);
      const val = Number(pag?.valor || 0);
      return {
        recebido: prev.recebido + val,
        pendente: pag?.status === "pendente" ? prev.pendente - val : prev.pendente,
        atrasado: pag?.status === "atrasado" ? prev.atrasado - val : prev.atrasado,
        sinalizados: pag?.sinalizado_em ? prev.sinalizados - 1 : prev.sinalizados,
      };
    });
  }

  async function rejeitarComprovante(pagId: string) {
    try {
      const supabase = createClient();
      await supabase
        .from("pagamentos")
        .update({
          comprovante_url: null,
          sinalizado_em: null,
        })
        .eq("id", pagId);
    } catch {
      // mock
    }
    setPagamentos((prev) =>
      prev.map((p) =>
        p.id === pagId ? { ...p, comprovante_url: null, sinalizado_em: null } : p
      )
    );
    setResumo((prev) => ({ ...prev, sinalizados: Math.max(0, prev.sinalizados - 1) }));
    setModalComprovante(null);
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-dark-light rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400">Recebido</p>
          <p className="text-sm font-bold text-success">{formatarMoeda(resumo.recebido)}</p>
        </div>
        <div className="bg-dark-light rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400">Pendente</p>
          <p className="text-sm font-bold text-warning">{formatarMoeda(resumo.pendente)}</p>
        </div>
        <div className="bg-dark-light rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400">Atrasado</p>
          <p className="text-sm font-bold text-danger">{formatarMoeda(resumo.atrasado)}</p>
        </div>
      </div>

      {/* Alerta de comprovantes pendentes */}
      {resumo.sinalizados > 0 && (
        <button
          onClick={() => setFiltro(filtro === "sinalizados" ? "todos" : "sinalizados")}
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
            filtro === "sinalizados"
              ? "bg-orange-500 text-white"
              : "bg-orange-500/20 border border-orange-500/40 text-orange-400"
          }`}
        >
          {resumo.sinalizados} comprovante(s) aguardando confirmacao
        </button>
      )}

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["todos", "pago", "pendente", "atrasado"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filtro === f ? "bg-gold text-black" : "bg-dark-light text-gray-400"
            }`}
          >
            {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {pagamentos.map((pag: any) => (
          <div key={pag.id} className="bg-dark-light rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{pag.alunos?.perfis?.nome}</p>
                <p className="text-xs text-gray-400">Ref: {pag.referencia}</p>
              </div>
              <div className="flex items-center gap-2">
                {pag.sinalizado_em && pag.status !== "pago" && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400">
                    Comprovante
                  </span>
                )}
                <StatusBadge label={pag.status} colorClass={corStatusPagamento(pag.status)} />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gold font-bold">{formatarMoeda(Number(pag.valor))}</span>
              <span className="text-gray-400 text-xs">Venc: {formatarData(pag.data_vencimento || pag.dataVencimento)}</span>
            </div>
            {pag.status === "pago" && (pag.data_pagamento || pag.dataPagamento) && (
              <p className="text-xs text-gray-500">
                Pago em {formatarData(pag.data_pagamento || pag.dataPagamento)} via {(pag.forma_pagamento || pag.formaPagamento || "").toUpperCase()}
              </p>
            )}

            {/* Comprovante enviado pelo aluno */}
            {pag.sinalizado_em && pag.status !== "pago" && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-orange-400">
                    Comprovante enviado em {new Date(pag.sinalizado_em).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                {/* Visualizar comprovante */}
                {modalComprovante === pag.id ? (
                  <div className="space-y-2">
                    {pag.comprovante_url && (
                      pag.comprovante_url.endsWith(".pdf") ? (
                        <a
                          href={pag.comprovante_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full py-2 rounded-lg bg-dark text-gold text-sm text-center"
                        >
                          Abrir PDF do comprovante
                        </a>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={pag.comprovante_url}
                          alt="Comprovante"
                          className="w-full rounded-lg border border-gray-700"
                        />
                      )
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setModalRegistrar(pag.id);
                          setModalComprovante(null);
                        }}
                        className="py-2 rounded-lg bg-success text-white text-xs font-medium"
                      >
                        Confirmar Pagamento
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Rejeitar este comprovante?")) rejeitarComprovante(pag.id);
                        }}
                        className="py-2 rounded-lg bg-danger/20 text-danger text-xs font-medium"
                      >
                        Rejeitar
                      </button>
                    </div>
                    <button
                      onClick={() => setModalComprovante(null)}
                      className="w-full py-1.5 text-gray-400 text-xs"
                    >
                      Fechar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setModalComprovante(pag.id)}
                    className="w-full py-2 rounded-lg bg-orange-500/20 text-orange-400 text-sm font-medium"
                  >
                    Ver Comprovante
                  </button>
                )}
              </div>
            )}

            {pag.asaas_invoice_url && pag.status !== "pago" && (
              <a
                href={pag.asaas_invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2 rounded-lg bg-gold/20 text-gold text-sm font-medium text-center"
              >
                Link de Pagamento
              </a>
            )}
            {(pag.status === "pendente" || pag.status === "atrasado") && (
              <>
                {modalRegistrar === pag.id ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">Forma de pagamento:</p>
                    <div className="flex gap-2 flex-wrap">
                      {(["pix", "cartao", "dinheiro", "boleto"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => registrarPagamento(pag.id, f)}
                          className="px-3 py-1.5 rounded-lg bg-success/20 text-success text-xs font-medium"
                        >
                          {f === "cartao" ? "Cartao" : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                      <button
                        onClick={() => setModalRegistrar(null)}
                        className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-400 text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  !pag.sinalizado_em && (
                    <button
                      onClick={() => setModalRegistrar(pag.id)}
                      className="w-full py-2 rounded-lg bg-success/20 text-success text-sm font-medium"
                    >
                      Registrar Pagamento
                    </button>
                  )
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
