"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useModalidades } from "@/lib/modalidades/ModalidadesProvider";

const ACADEMIA_LAT = Number(process.env.NEXT_PUBLIC_ACADEMIA_LAT) || -23.5505;
const ACADEMIA_LNG = Number(process.env.NEXT_PUBLIC_ACADEMIA_LNG) || -46.6333;
const RAIO = Number(process.env.NEXT_PUBLIC_ACADEMIA_RAIO) || 200;
const JANELA_CANCELAMENTO_MIN = 30;

const DIAS_SEMANA_CURTO: Record<number, string> = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sab" };

function calcDist(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function minutosDesde(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 60000;
}

export default function AlunoCheckinPage() {
  const { byMap } = useModalidades();
  const [alunoId, setAlunoId] = useState<string | null>(null);
  const [modalidades, setModalidades] = useState<string[]>([]);
  const [aulasDoDia, setAulasDoDia] = useState<any[]>([]);
  const [aulaSel, setAulaSel] = useState<string>("");
  const [modalidadeSel, setModalidadeSel] = useState<string>("");
  const [meusCheckins, setMeusCheckins] = useState<any[]>([]);
  const [carregandoAluno, setCarregandoAluno] = useState(true);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [mensagem, setMensagem] = useState("");
  const [cancelando, setCancelando] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/me/aluno");
        const data = await res.json();
        if (data?.aluno) {
          setAlunoId(data.aluno.id);
          const mods = data.aluno.modalidades || [];
          setModalidades(mods);
          setModalidadeSel(mods[0] || "");

          // Aulas do dia das modalidades do aluno
          const supabase = createClient();
          const hoje = new Date().getDay();
          const { data: aulas } = await supabase
            .from("aulas")
            .select("*")
            .eq("dia_semana", hoje)
            .eq("ativo", true)
            .in("modalidade", mods.length > 0 ? mods : ["__none__"])
            .order("hora_inicio");
          setAulasDoDia(aulas || []);

          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: ci } = await supabase
              .from("checkins")
              .select("*")
              .eq("aluno_id", user.id)
              .order("data_hora_entrada", { ascending: false })
              .limit(20);
            setMeusCheckins(ci || []);
          }
        }
      } catch { /* */ }
      setCarregandoAluno(false);
    }
    fetchData();
  }, []);

  function selecionarAula(aulaId: string, modalidade: string) {
    setAulaSel(aulaId);
    setModalidadeSel(modalidade);
  }

  function fazerCheckIn() {
    if (!modalidadeSel || !alunoId) {
      setStatus("error");
      setMensagem("Selecione uma aula ou modalidade.");
      return;
    }
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
          const insertPayload: any = {
            aluno_id: alunoId,
            modalidade: modalidadeSel,
            latitude,
            longitude,
            validado,
          };
          if (aulaSel) insertPayload.aula_id = aulaSel;

          const { data, error } = await supabase
            .from("checkins")
            .insert(insertPayload)
            .select()
            .single();

          if (error) {
            // Se aula_id ainda nao existir no schema, tentar sem
            if (aulaSel && /aula_id/i.test(error.message)) {
              delete insertPayload.aula_id;
              const retry = await supabase.from("checkins").insert(insertPayload).select().single();
              if (retry.data) setMeusCheckins((prev) => [retry.data, ...prev]);
            } else {
              throw error;
            }
          } else if (data) {
            setMeusCheckins((prev) => [data, ...prev]);
          }
        } catch (err: any) {
          setStatus("error");
          setMensagem("Erro ao gravar check-in: " + (err.message || ""));
          return;
        }

        setStatus("success");
        setMensagem(
          validado
            ? `Check-in validado! Voce esta a ${Math.round(dist)}m da academia.`
            : `Check-in registrado. Distancia: ${Math.round(dist)}m (fora do raio de ${RAIO}m - aguardando validacao do professor).`
        );
        setAulaSel("");
      },
      () => {
        setStatus("error");
        setMensagem("Nao foi possivel obter sua localizacao. Verifique as permissoes do navegador.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function cancelarCheckin(checkinId: string) {
    if (!confirm("Cancelar este check-in?")) return;
    setCancelando(checkinId);
    try {
      const res = await fetch(`/api/me/checkins/${checkinId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Falha ao cancelar");
        setCancelando(null);
        return;
      }
      setMeusCheckins((prev) => prev.filter((c) => c.id !== checkinId));
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
    setCancelando(null);
  }

  if (carregandoAluno) {
    return <div className="text-center py-20 text-gray-400">Carregando...</div>;
  }

  if (modalidades.length === 0) {
    return (
      <div className="bg-dark-light rounded-xl p-6 text-center">
        <p className="text-gray-400 text-sm">Nenhuma modalidade vinculada ao seu cadastro.</p>
        <p className="text-gray-500 text-xs mt-2">Fale com a administracao da academia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card principal */}
      <div className="bg-dark-light rounded-xl p-6 text-center space-y-5">
        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
          status === "success" ? "bg-success/20" : status === "error" ? "bg-danger/20" : "bg-gold/20"
        }`}>
          {status === "success" ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-12 h-12 text-success">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : status === "error" ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-12 h-12 text-danger">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-12 h-12 text-gold">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-white">
            {status === "success" ? "Check-in Realizado!" : status === "error" ? "Erro" : "Registrar Presenca"}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {status === "idle" ? "Escolha sua aula de hoje" : ""}
          </p>
        </div>

        {/* Lista de aulas de hoje */}
        {status === "idle" && (
          <div className="space-y-2 text-left">
            {aulasDoDia.length > 0 ? (
              <>
                <p className="text-xs uppercase tracking-wider text-gray-400">Aulas de hoje ({DIAS_SEMANA_CURTO[new Date().getDay()]})</p>
                {aulasDoDia.map((aula) => (
                  <button
                    key={aula.id}
                    onClick={() => selecionarAula(aula.id, aula.modalidade)}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors text-left flex items-center justify-between ${
                      aulaSel === aula.id
                        ? "bg-gold text-black border-gold"
                        : "bg-dark text-gray-200 border-gray-700"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {byMap[aula.modalidade]?.nome ?? aula.modalidade}
                      </p>
                      <p className={`text-xs ${aulaSel === aula.id ? "text-black/70" : "text-gray-400"}`}>
                        {aula.hora_inicio?.slice(0, 5)} - {aula.hora_fim?.slice(0, 5)}
                      </p>
                    </div>
                    {aulaSel === aula.id && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                ))}
              </>
            ) : (
              <p className="text-xs text-gray-500 text-center py-2">
                Nenhuma aula sua hoje. Selecione a modalidade abaixo para check-in avulso.
              </p>
            )}

            <p className="text-xs uppercase tracking-wider text-gray-400 mt-3">Ou modalidade avulsa</p>
            <div className="flex gap-2 flex-wrap">
              {modalidades.map((mod) => (
                <button
                  key={mod}
                  onClick={() => { setAulaSel(""); setModalidadeSel(mod); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    !aulaSel && modalidadeSel === mod
                      ? "bg-gold text-black"
                      : "bg-dark text-gray-400 border border-gray-700"
                  }`}
                >
                  {byMap[mod]?.nome ?? mod}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagem && (
          <p className={`text-sm ${status === "success" ? "text-success" : "text-danger"}`}>
            {mensagem}
          </p>
        )}

        {status === "idle" || status === "loading" ? (
          <button
            onClick={fazerCheckIn}
            disabled={status === "loading"}
            className="w-full py-4 rounded-xl bg-gold text-black font-bold text-lg active:bg-gold-dark transition-colors disabled:opacity-50"
          >
            {status === "loading" ? "Verificando localizacao..." : "Fazer Check-in"}
          </button>
        ) : (
          <button
            onClick={() => { setStatus("idle"); setMensagem(""); }}
            className="w-full py-3 rounded-xl bg-dark text-gray-300 font-medium border border-gray-700"
          >
            Novo Check-in
          </button>
        )}
      </div>

      {/* Historico */}
      <section>
        <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
          Meu Historico ({meusCheckins.length} treinos)
        </h3>
        <div className="space-y-2">
          {meusCheckins.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Nenhum check-in registrado.</p>
          ) : (
            meusCheckins.map((ci) => {
              const min = minutosDesde(ci.data_hora_entrada);
              const podeCancelar = min < JANELA_CANCELAMENTO_MIN;
              return (
                <div key={ci.id} className="bg-dark-light rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-white">{byMap[ci.modalidade]?.nome ?? ci.modalidade}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(ci.data_hora_entrada).toLocaleDateString("pt-BR")} as{" "}
                      {new Date(ci.data_hora_entrada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      ci.validado ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                    }`}>
                      {ci.validado ? "Validado" : "Pendente"}
                    </span>
                    {podeCancelar && (
                      <button
                        onClick={() => cancelarCheckin(ci.id)}
                        disabled={cancelando === ci.id}
                        className="text-xs text-danger underline disabled:opacity-50"
                        title={`Cancelar (ate ${Math.max(0, Math.ceil(JANELA_CANCELAMENTO_MIN - min))} min)`}
                      >
                        {cancelando === ci.id ? "..." : "Cancelar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
