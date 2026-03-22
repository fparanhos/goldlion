"use client";

import { useState } from "react";
import { mensagens as mockMsgs, alunos as mockAlunos } from "@/lib/mock-data";

const ALUNO_MOCK_ID = "a1";

const canais = ["geral", "muaythai", "boxe", "jiujitsu"] as const;
const nomeCanal: Record<string, string> = {
  geral: "Geral",
  muaythai: "Muay Thai",
  boxe: "Boxe",
  jiujitsu: "Jiu-Jitsu",
};

export default function AlunoAvisosPage() {
  const aluno = mockAlunos.find((a) => a.id === ALUNO_MOCK_ID)!;
  // Aluno ve canais geral + suas modalidades
  const meusCanais = ["geral", ...aluno.modalidades];
  const [canalAtivo, setCanalAtivo] = useState<string>("geral");

  const msgs = mockMsgs
    .filter((m) => m.canal === canalAtivo)
    .map((m) => ({
      ...m,
      perfis: { nome: m.remetenteNome, perfil: "admin" },
      criado_em: m.criadoEm,
    }));

  return (
    <div className="space-y-4">
      {/* Canais */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {canais.filter((c) => meusCanais.includes(c)).map((canal) => (
          <button
            key={canal}
            onClick={() => setCanalAtivo(canal)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              canalAtivo === canal ? "bg-gold text-black" : "bg-dark-light text-gray-400"
            }`}
          >
            {nomeCanal[canal]}
          </button>
        ))}
      </div>

      {/* Mensagens */}
      <div className="space-y-3">
        {msgs.length === 0 ? (
          <div className="bg-dark-light rounded-xl p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 text-gray-600 mx-auto mb-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
            <p className="text-gray-500 text-sm">Nenhum aviso neste canal.</p>
          </div>
        ) : (
          msgs.map((msg) => (
            <div key={msg.id} className="bg-dark-light rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="text-gold text-xs font-bold">
                      {msg.perfis.nome.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gold">{msg.perfis.nome}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(msg.criado_em).toLocaleDateString("pt-BR")}{" "}
                  {new Date(msg.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{msg.conteudo}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
