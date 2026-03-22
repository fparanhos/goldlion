"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient, isDemoMode } from "@/lib/supabase/client";
import { aulas as mockAulas } from "@/lib/mock-data";
import { nomeModalidade, diasDaSemanaCurto } from "@/lib/utils";

export default function ProfessorDashboard() {
  const [perfil, setPerfil] = useState<any>(null);
  const [minhasAulas, setMinhasAulas] = useState<any[]>([]);
  const [checkinsHoje, setCheckinsHoje] = useState<any[]>([]);
  const hoje = new Date().getDay();

  useEffect(() => {
    async function load() {
      if (isDemoMode) {
        setPerfil({ nome: "Prof. Ricardo" });
        setMinhasAulas(mockAulas.filter((a) => a.professorId === "prof1"));
        return;
      }

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: perfilData } = await supabase
          .from("perfis")
          .select("*")
          .eq("id", user.id)
          .single();
        setPerfil(perfilData);

        const { data: aulas } = await supabase
          .from("aulas")
          .select("*")
          .eq("professor_id", user.id)
          .eq("ativo", true)
          .order("dia_semana")
          .order("hora_inicio");
        setMinhasAulas(aulas || []);

        const hojeStr = new Date().toISOString().split("T")[0];
        const { data: cis } = await supabase
          .from("checkins")
          .select("*, alunos!inner(id, perfis!inner(nome))")
          .gte("data_hora_entrada", `${hojeStr}T00:00:00`)
          .order("data_hora_entrada", { ascending: false })
          .limit(20);
        setCheckinsHoje(cis || []);
      } catch {
        setPerfil({ nome: "Prof. Ricardo" });
        setMinhasAulas(mockAulas.filter((a) => a.professorId === "prof1"));
      }
    }
    load();
  }, []);

  const aulasHoje = minhasAulas.filter((a) => (a.dia_semana ?? a.diaSemana) === hoje);
  const diasSemana: Record<number, string> = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sab" };

  return (
    <div className="space-y-5">
      {/* Saudacao */}
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-gold-dark flex items-center justify-center text-lg font-bold text-white">
          {(perfil?.nome || "P").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <p className="text-sm text-gray-400">Ola, Professor</p>
          <h2 className="text-xl font-bold text-white">{perfil?.nome || "..."}</h2>
        </div>
      </div>

      {/* Aulas de hoje */}
      <section>
        <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
          Aulas de Hoje ({diasDaSemanaCurto(hoje)})
        </h3>
        {aulasHoje.length === 0 ? (
          <div className="bg-dark-light rounded-xl p-4 text-center">
            <p className="text-gray-500 text-sm">Nenhuma aula sua hoje.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {aulasHoje.map((aula: any) => (
              <div key={aula.id} className="bg-dark-light rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{nomeModalidade(aula.modalidade)}</p>
                  <p className="text-xs text-gray-400">{aula.vagas} vagas</p>
                </div>
                <p className="text-gold font-mono font-medium">
                  {aula.hora_inicio || aula.horaInicio} - {aula.hora_fim || aula.horaFim}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Botao Check-in */}
      <Link
        href="/professor/checkin"
        className="block w-full py-4 rounded-xl bg-gold text-black font-bold text-lg text-center active:bg-gold-dark transition-colors"
      >
        Fazer Check-in
      </Link>

      {/* Check-ins dos alunos hoje */}
      <section>
        <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
          Check-ins de Alunos Hoje
        </h3>
        {checkinsHoje.length === 0 ? (
          <p className="text-gray-500 text-sm bg-dark-light rounded-xl p-4 text-center">Nenhum check-in hoje.</p>
        ) : (
          <div className="space-y-2">
            {checkinsHoje.map((ci: any) => (
              <div key={ci.id} className="bg-dark-light rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-white">{ci.alunos?.perfis?.nome}</p>
                  <p className="text-xs text-gray-400">{nomeModalidade(ci.modalidade)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    {new Date(ci.data_hora_entrada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                    ci.validado ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                  }`}>
                    {ci.validado ? "Validado" : "Pendente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Grade completa */}
      <section>
        <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
          Minha Grade Semanal
        </h3>
        <div className="space-y-2">
          {minhasAulas.map((aula: any) => (
            <div key={aula.id} className="bg-dark-light rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-white">{nomeModalidade(aula.modalidade)}</p>
                <p className="text-xs text-gray-400">{diasSemana[aula.dia_semana ?? aula.diaSemana]}</p>
              </div>
              <p className="text-gold font-mono text-sm">
                {aula.hora_inicio || aula.horaInicio} - {aula.hora_fim || aula.horaFim}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
