"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { pagamentos as mockPags, alunos as mockAlunos } from "@/lib/mock-data";
import { formatarMoeda, formatarData, corStatusPagamento } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import type { StatusPagamento } from "@/types";

export default function FinanceiroPage() {
  const [filtro, setFiltro] = useState<StatusPagamento | "todos">("todos");
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [resumo, setResumo] = useState({ recebido: 0, pendente: 0, atrasado: 0 });
  const [modalRegistrar, setModalRegistrar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const supabase = createClient();
        let query = supabase
          .from("pagamentos")
          .select("*, alunos!inner(id, perfis!inner(nome))")
          .order("data_vencimento", { ascending: false });

        if (filtro !== "todos") {
          query = query.eq("status", filtro);
        }

        const { data, error } = await query;
        if (error) throw error;
        setPagamentos(data || []);

        // Resumo
        const { data: todos } = await supabase.from("pagamentos").select("valor, status");
        const r = { recebido: 0, pendente: 0, atrasado: 0 };
        todos?.forEach((p) => {
          if (p.status === "pago") r.recebido += Number(p.valor);
          if (p.status === "pendente") r.pendente += Number(p.valor);
          if (p.status === "atrasado") r.atrasado += Number(p.valor);
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
        });
      }
      setLoading(false);
    }
    fetch();
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
      };
    });
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
              <StatusBadge label={pag.status} colorClass={corStatusPagamento(pag.status)} />
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
                ) : (
                  <button
                    onClick={() => setModalRegistrar(pag.id)}
                    className="w-full py-2 rounded-lg bg-success/20 text-success text-sm font-medium"
                  >
                    Registrar Pagamento
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
