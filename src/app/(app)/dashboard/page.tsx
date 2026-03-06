"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { alunos as mockAlunos, pagamentos as mockPags, checkins as mockCheckins, aulas as mockAulas } from "@/lib/mock-data";
import { formatarMoeda, nomeModalidade, diasDaSemanaCurto } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";

interface DashData {
  totalAlunos: number;
  inadimplentes: number;
  checkinsHoje: number;
  receitaMes: number;
  pagamentosAtrasados: number;
  aulasHoje: any[];
  ultimosCheckins: any[];
}

function getMockDashboard(): DashData {
  const hoje = new Date().getDay();
  return {
    totalAlunos: mockAlunos.filter((a) => a.status === "ativo").length,
    inadimplentes: mockAlunos.filter((a) => a.status === "inadimplente").length,
    checkinsHoje: mockCheckins.filter((c) => c.dataHoraEntrada.startsWith("2026-03-06")).length,
    receitaMes: mockPags.filter((p) => p.status === "pago").reduce((acc, p) => acc + p.valor, 0),
    pagamentosAtrasados: mockPags.filter((p) => p.status === "atrasado").length,
    aulasHoje: mockAulas.filter((a) => a.diaSemana === hoje).map((a) => ({
      id: a.id,
      modalidade: a.modalidade,
      hora_inicio: a.horaInicio,
      hora_fim: a.horaFim,
      perfis: { nome: a.professorNome },
    })),
    ultimosCheckins: mockCheckins.slice(0, 3).map((c) => ({
      id: c.id,
      modalidade: c.modalidade,
      data_hora_entrada: c.dataHoraEntrada,
      validado: c.validado,
      alunos: { perfis: { nome: mockAlunos.find((a) => a.id === c.alunoId)?.nome || "" } },
    })),
  };
}

export default function DashboardPage() {
  const [dash, setDash] = useState<DashData>(getMockDashboard());
  const hoje = new Date().getDay();

  useEffect(() => {
    async function fetchDash() {
      try {
        const supabase = createClient();
        const hojeStr = new Date().toISOString().split("T")[0];
        const mesAtual = hojeStr.slice(0, 7);

        const [ativos, inad, ciHoje, pagsMes, pagsAtrasados, aulasH, ultCI] =
          await Promise.all([
            supabase.from("alunos").select("id", { count: "exact", head: true }).eq("status", "ativo"),
            supabase.from("alunos").select("id", { count: "exact", head: true }).eq("status", "inadimplente"),
            supabase.from("checkins").select("id", { count: "exact", head: true }).gte("data_hora_entrada", `${hojeStr}T00:00:00`).lte("data_hora_entrada", `${hojeStr}T23:59:59`),
            supabase.from("pagamentos").select("valor, status").eq("status", "pago").gte("data_pagamento", `${mesAtual}-01`).lte("data_pagamento", `${mesAtual}-31`),
            supabase.from("pagamentos").select("id", { count: "exact", head: true }).eq("status", "atrasado"),
            supabase.from("aulas").select("*, perfis!professor_id(nome)").eq("dia_semana", new Date().getDay()).eq("ativo", true).order("hora_inicio"),
            supabase.from("checkins").select("*, alunos!inner(id, perfis!inner(nome))").gte("data_hora_entrada", `${hojeStr}T00:00:00`).order("data_hora_entrada", { ascending: false }).limit(5),
          ]);

        if (ativos.error) throw ativos.error;

        setDash({
          totalAlunos: ativos.count || 0,
          inadimplentes: inad.count || 0,
          checkinsHoje: ciHoje.count || 0,
          receitaMes: pagsMes.data?.reduce((acc, p) => acc + Number(p.valor), 0) || 0,
          pagamentosAtrasados: pagsAtrasados.count || 0,
          aulasHoje: aulasH.data || [],
          ultimosCheckins: ultCI.data || [],
        });
      } catch {
        // Usa mock data se Supabase nao conecta
      }
    }

    fetchDash();
  }, []);

  return (
    <div className="space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Alunos Ativos" value={dash.totalAlunos} color="text-success" />
        <StatCard label="Check-ins Hoje" value={dash.checkinsHoje} color="text-gold" />
        <StatCard label="Receita Mes" value={formatarMoeda(dash.receitaMes)} color="text-success" small />
        <StatCard label="Inadimplentes" value={dash.inadimplentes + dash.pagamentosAtrasados} color="text-danger" />
      </div>

      {/* Aulas de hoje */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
          Aulas de Hoje ({diasDaSemanaCurto(hoje)})
        </h2>
        {dash.aulasHoje.length === 0 ? (
          <p className="text-gray-500 text-sm bg-dark-light rounded-lg p-4">
            Nenhuma aula programada para hoje.
          </p>
        ) : (
          <div className="space-y-2">
            {dash.aulasHoje.map((aula: any) => (
              <div key={aula.id} className="bg-dark-light rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{nomeModalidade(aula.modalidade)}</p>
                  <p className="text-sm text-gray-400">{aula.perfis?.nome || aula.professorNome}</p>
                </div>
                <p className="text-gold font-mono text-sm">
                  {aula.hora_inicio || aula.horaInicio} - {aula.hora_fim || aula.horaFim}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ultimos check-ins */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Ultimos Check-ins</h2>
          <Link href="/checkin" className="text-gold text-xs">Ver todos</Link>
        </div>
        <div className="space-y-2">
          {dash.ultimosCheckins.length === 0 ? (
            <p className="text-gray-500 text-sm bg-dark-light rounded-lg p-4">Nenhum check-in hoje.</p>
          ) : (
            dash.ultimosCheckins.map((ci: any) => (
              <div key={ci.id} className="bg-dark-light rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{ci.alunos?.perfis?.nome}</p>
                  <p className="text-xs text-gray-400">{nomeModalidade(ci.modalidade)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    {new Date(ci.data_hora_entrada || ci.dataHoraEntrada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <StatusBadge label={ci.validado ? "OK" : "Pendente"} colorClass={ci.validado ? "bg-success text-white" : "bg-warning text-black"} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Alertas */}
      {(dash.inadimplentes > 0 || dash.pagamentosAtrasados > 0) && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Alertas</h2>
          <Link href="/financeiro" className="block bg-danger/20 border border-danger/30 rounded-lg p-3">
            <p className="text-danger font-medium text-sm">{dash.pagamentosAtrasados} pagamento(s) atrasado(s)</p>
            <p className="text-gray-400 text-xs mt-1">Toque para ver detalhes</p>
          </Link>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, color, small }: { label: string; value: string | number; color: string; small?: boolean }) {
  return (
    <div className="bg-dark-light rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`${small ? "text-lg" : "text-2xl"} font-bold ${color}`}>{value}</p>
    </div>
  );
}
