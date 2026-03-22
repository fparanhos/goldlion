"use client";

import { useState } from "react";
import { alunos as mockAlunos, checkins as mockCheckins } from "@/lib/mock-data";
import { nomeModalidade } from "@/lib/utils";
import type { Modalidade } from "@/types";

const ALUNO_MOCK_ID = "a1";
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

export default function AlunoCheckinPage() {
  const aluno = mockAlunos.find((a) => a.id === ALUNO_MOCK_ID)!;
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [mensagem, setMensagem] = useState("");
  const [modalidadeSel, setModalidadeSel] = useState<Modalidade>(aluno.modalidades[0] as Modalidade);

  const meusCheckins = mockCheckins.filter((c) => c.alunoId === ALUNO_MOCK_ID);

  function fazerCheckIn() {
    setStatus("loading");

    if (!navigator.geolocation) {
      setStatus("error");
      setMensagem("Geolocalizacao nao suportada neste dispositivo.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const dist = calcDist(latitude, longitude, ACADEMIA_LAT, ACADEMIA_LNG);
        const validado = dist <= RAIO;

        if (validado) {
          setStatus("success");
          setMensagem(`Check-in validado! Voce esta a ${Math.round(dist)}m da academia.`);
        } else {
          setStatus("success");
          setMensagem(`Check-in registrado. Distancia: ${Math.round(dist)}m (fora do raio de ${RAIO}m - aguardando validacao do professor).`);
        }
      },
      () => {
        setStatus("error");
        setMensagem("Nao foi possivel obter sua localizacao. Verifique as permissoes do navegador.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
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
            {status === "idle" ? "Selecione a modalidade e confirme" : ""}
          </p>
        </div>

        {/* Selecao de modalidade */}
        {status === "idle" && (
          <div className="flex gap-2 justify-center flex-wrap">
            {aluno.modalidades.map((mod) => (
              <button
                key={mod}
                onClick={() => setModalidadeSel(mod as Modalidade)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  modalidadeSel === mod ? "bg-gold text-black" : "bg-dark text-gray-400 border border-gray-700"
                }`}
              >
                {nomeModalidade(mod)}
              </button>
            ))}
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
          {meusCheckins.map((ci) => (
            <div key={ci.id} className="bg-dark-light rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-white">{nomeModalidade(ci.modalidade)}</p>
                <p className="text-xs text-gray-400">
                  {new Date(ci.dataHoraEntrada).toLocaleDateString("pt-BR")} as{" "}
                  {new Date(ci.dataHoraEntrada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                ci.validado ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
              }`}>
                {ci.validado ? "Validado" : "Pendente"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
