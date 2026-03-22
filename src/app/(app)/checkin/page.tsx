"use client";

import { useState, useEffect } from "react";
import { createClient, isDemoMode } from "@/lib/supabase/client";
import { checkins as mockCheckins, alunos as mockAlunos } from "@/lib/mock-data";
import { nomeModalidade, formatarDataHora } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import type { Modalidade } from "@/types";

const ACADEMIA_LAT = Number(process.env.NEXT_PUBLIC_ACADEMIA_LAT) || -23.5505;
const ACADEMIA_LNG = Number(process.env.NEXT_PUBLIC_ACADEMIA_LNG) || -46.6333;
const RAIO = Number(process.env.NEXT_PUBLIC_ACADEMIA_RAIO) || 200;

function calcDist(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CheckInPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [mensagem, setMensagem] = useState("");
  const [modalidadeSel, setModalidadeSel] = useState<Modalidade>("muaythai");
  const [historico, setHistorico] = useState<any[]>([]);

  useEffect(() => {
    async function fetchHistorico() {
      try {
        if (isDemoMode) throw new Error("demo");
        const supabase = createClient();
        const { data, error } = await supabase
          .from("checkins")
          .select("*, alunos!inner(id, perfis!inner(nome))")
          .order("data_hora_entrada", { ascending: false })
          .limit(20);
        if (error) throw error;
        setHistorico(data || []);
      } catch {
        setHistorico(
          mockCheckins.map((c) => ({
            ...c,
            data_hora_entrada: c.dataHoraEntrada,
            data_hora_saida: c.dataHoraSaida,
            alunos: { perfis: { nome: mockAlunos.find((a) => a.id === c.alunoId)?.nome } },
          }))
        );
      }
    }
    fetchHistorico();
  }, [status]);

  async function fazerCheckIn() {
    setStatus("loading");

    if (!navigator.geolocation) {
      setStatus("error");
      setMensagem("Geolocalizacao nao suportada neste dispositivo.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const dist = calcDist(latitude, longitude, ACADEMIA_LAT, ACADEMIA_LNG);
        const validado = dist <= RAIO;

        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            const { error } = await supabase.from("checkins").insert({
              aluno_id: user.id,
              modalidade: modalidadeSel,
              latitude,
              longitude,
              validado,
            });

            if (error) throw error;
          }
        } catch {
          // Mock mode
        }

        if (validado) {
          setStatus("success");
          setMensagem(`Check-in validado! Distancia: ${Math.round(dist)}m`);
        } else {
          setStatus("success");
          setMensagem(`Check-in registrado. Distancia: ${Math.round(dist)}m (fora do raio de ${RAIO}m - aguardando validacao)`);
        }
      },
      () => {
        setStatus("error");
        setMensagem("Nao foi possivel obter sua localizacao. Verifique as permissoes.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function fazerCheckout(checkinId: string) {
    try {
      const supabase = createClient();
      await supabase
        .from("checkins")
        .update({ data_hora_saida: new Date().toISOString() })
        .eq("id", checkinId);
    } catch {
      // mock
    }
    setHistorico((prev) =>
      prev.map((c) =>
        c.id === checkinId ? { ...c, data_hora_saida: new Date().toISOString() } : c
      )
    );
  }

  return (
    <div className="space-y-6">
      {/* Selecao de modalidade + Check-in */}
      <div className="bg-dark-light rounded-xl p-6 text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-gold/20 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-10 h-10 text-gold">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </div>

        <div>
          <h2 className="text-lg font-bold">Check-in por Localizacao</h2>
          <p className="text-sm text-gray-400 mt-1">Selecione a modalidade e confirme presenca</p>
        </div>

        {/* Modalidade */}
        <div className="flex gap-2 justify-center">
          {(["muaythai", "boxe", "jiujitsu"] as const).map((mod) => (
            <button
              key={mod}
              onClick={() => setModalidadeSel(mod)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                modalidadeSel === mod ? "bg-gold text-black" : "bg-dark text-gray-400"
              }`}
            >
              {nomeModalidade(mod)}
            </button>
          ))}
        </div>

        <button
          onClick={fazerCheckIn}
          disabled={status === "loading"}
          className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${
            status === "loading" ? "bg-gray-600 text-gray-400" : "bg-gold text-black active:bg-gold-dark"
          }`}
        >
          {status === "loading" ? "Verificando..." : "Fazer Check-in"}
        </button>

        {mensagem && (
          <p className={`text-sm ${status === "success" ? "text-success" : "text-danger"}`}>
            {mensagem}
          </p>
        )}
      </div>

      {/* Historico */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
          Historico de Check-ins
        </h2>
        <div className="space-y-2">
          {historico.map((ci: any) => (
            <div key={ci.id} className="bg-dark-light rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{ci.alunos?.perfis?.nome}</p>
                <p className="text-xs text-gray-400">
                  {nomeModalidade(ci.modalidade)} - {formatarDataHora(ci.data_hora_entrada || ci.dataHoraEntrada)}
                </p>
              </div>
              <div className="text-right space-y-1">
                <StatusBadge
                  label={ci.validado ? "Validado" : "Pendente"}
                  colorClass={ci.validado ? "bg-success text-white" : "bg-warning text-black"}
                />
                {(ci.data_hora_saida || ci.dataHoraSaida) ? (
                  <p className="text-xs text-gray-500">
                    Saida: {new Date(ci.data_hora_saida || ci.dataHoraSaida).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                ) : (
                  <button
                    onClick={() => fazerCheckout(ci.id)}
                    className="text-xs text-gold underline"
                  >
                    Check-out
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
