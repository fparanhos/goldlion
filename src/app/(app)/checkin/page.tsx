"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatarDataHora } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import { useModalidades } from "@/lib/modalidades/ModalidadesProvider";

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
  const { modalidadesAtivas, byMap } = useModalidades();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [mensagem, setMensagem] = useState("");
  const [modalidadeSel, setModalidadeSel] = useState<string>("");
  const [historico, setHistorico] = useState<any[]>([]);
  const [filtroModalidade, setFiltroModalidade] = useState<string>("todas");
  const [filtroValidado, setFiltroValidado] = useState<"todos" | "validado" | "pendente">("todos");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (!modalidadeSel && modalidadesAtivas.length > 0) {
      setModalidadeSel(modalidadesAtivas[0].slug);
    }
  }, [modalidadesAtivas, modalidadeSel]);

  const fetchHistorico = useCallback(async () => {
    try {
      const supabase = createClient();
      let query = supabase
        .from("checkins")
        .select("*, alunos!inner(id, perfis!inner(nome))")
        .order("data_hora_entrada", { ascending: false })
        .limit(100);

      if (filtroModalidade !== "todas") {
        query = query.eq("modalidade", filtroModalidade);
      }
      if (filtroValidado === "validado") {
        query = query.eq("validado", true);
      } else if (filtroValidado === "pendente") {
        query = query.eq("validado", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      setHistorico(data || []);
    } catch {
      setHistorico([]);
    }
  }, [filtroModalidade, filtroValidado]);

  useEffect(() => { fetchHistorico(); }, [fetchHistorico, status]);

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
          // ignore
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
    } catch { /* */ }
    setHistorico((prev) =>
      prev.map((c) =>
        c.id === checkinId ? { ...c, data_hora_saida: new Date().toISOString() } : c
      )
    );
  }

  async function validarCheckin(checkinId: string) {
    try {
      const supabase = createClient();
      await supabase.from("checkins").update({ validado: true }).eq("id", checkinId);
      setHistorico((prev) => prev.map((c) => (c.id === checkinId ? { ...c, validado: true } : c)));
    } catch { /* */ }
  }

  async function excluirCheckin(checkinId: string) {
    if (!confirm("Excluir este check-in?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("checkins").delete().eq("id", checkinId);
      if (error) {
        alert("Erro: " + error.message);
        return;
      }
      setHistorico((prev) => prev.filter((c) => c.id !== checkinId));
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
  }

  const historicoFiltrado = historico.filter((c) => {
    if (!busca) return true;
    return (c.alunos?.perfis?.nome || "").toLowerCase().includes(busca.toLowerCase());
  });

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
        <div className="flex gap-2 justify-center flex-wrap">
          {modalidadesAtivas.map((mod) => (
            <button
              key={mod.slug}
              onClick={() => setModalidadeSel(mod.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                modalidadeSel === mod.slug ? "bg-gold text-black" : "bg-dark text-gray-400"
              }`}
            >
              {mod.nome}
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

      {/* Filtros */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Buscar por nome do aluno..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-dark-light border border-gray-700 text-white text-sm focus:border-gold focus:outline-none"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFiltroModalidade("todas")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filtroModalidade === "todas" ? "bg-gold text-black" : "bg-dark-light text-gray-400"
            }`}
          >
            Todas
          </button>
          {modalidadesAtivas.map((mod) => (
            <button
              key={mod.slug}
              onClick={() => setFiltroModalidade(mod.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filtroModalidade === mod.slug ? "bg-gold text-black" : "bg-dark-light text-gray-400"
              }`}
            >
              {mod.nome}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["todos", "validado", "pendente"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroValidado(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filtroValidado === f ? "bg-gold text-black" : "bg-dark-light text-gray-400"
              }`}
            >
              {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Historico */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
          Historico de Check-ins ({historicoFiltrado.length})
        </h2>
        <div className="space-y-2">
          {historicoFiltrado.length === 0 ? (
            <div className="bg-dark-light rounded-lg p-6 text-center">
              <p className="text-gray-500 text-sm">Nenhum check-in encontrado.</p>
            </div>
          ) : (
            historicoFiltrado.map((ci: any) => (
              <div key={ci.id} className="bg-dark-light rounded-lg p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{ci.alunos?.perfis?.nome}</p>
                  <p className="text-xs text-gray-400">
                    {byMap[ci.modalidade]?.nome ?? ci.modalidade} - {formatarDataHora(ci.data_hora_entrada)}
                  </p>
                </div>
                <div className="text-right space-y-1 flex flex-col items-end">
                  <StatusBadge
                    label={ci.validado ? "Validado" : "Pendente"}
                    colorClass={ci.validado ? "bg-success text-white" : "bg-warning text-black"}
                  />
                  <div className="flex items-center gap-2">
                    {!ci.validado && (
                      <button
                        onClick={() => validarCheckin(ci.id)}
                        className="text-xs text-success underline"
                      >
                        Validar
                      </button>
                    )}
                    {ci.data_hora_saida ? (
                      <p className="text-xs text-gray-500">
                        Saida: {new Date(ci.data_hora_saida).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    ) : (
                      <button
                        onClick={() => fazerCheckout(ci.id)}
                        className="text-xs text-gold underline"
                      >
                        Check-out
                      </button>
                    )}
                    <button
                      onClick={() => excluirCheckin(ci.id)}
                      className="text-xs text-danger underline"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
