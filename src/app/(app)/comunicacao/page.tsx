"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { mensagens as mockMsgs } from "@/lib/mock-data";

const canais = ["geral", "muaythai", "boxe", "jiujitsu"] as const;
const nomeCanal: Record<string, string> = {
  geral: "Geral",
  muaythai: "Muay Thai",
  boxe: "Boxe",
  jiujitsu: "Jiu-Jitsu",
};

export default function ComunicacaoPage() {
  const [canalAtivo, setCanalAtivo] = useState<string>("geral");
  const [novaMensagem, setNovaMensagem] = useState("");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [usandoMock, setUsandoMock] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchMensagens() {
      try {
        const { data, error } = await supabase
          .from("mensagens")
          .select("*, perfis!inner(nome, perfil)")
          .eq("canal", canalAtivo)
          .order("criado_em", { ascending: false })
          .limit(50);

        if (error) throw error;
        setMsgs(data || []);
        setUsandoMock(false);
      } catch {
        setMsgs(
          mockMsgs
            .filter((m) => m.canal === canalAtivo)
            .map((m) => ({
              ...m,
              perfis: { nome: m.remetenteNome, perfil: "admin" },
              criado_em: m.criadoEm,
            }))
        );
        setUsandoMock(true);
      }
    }

    fetchMensagens();

    // Realtime
    const channel = supabase
      .channel(`msgs-${canalAtivo}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens",
          filter: `canal=eq.${canalAtivo}`,
        },
        async (payload) => {
          const { data: msg } = await supabase
            .from("mensagens")
            .select("*, perfis!inner(nome, perfil)")
            .eq("id", payload.new.id)
            .single();

          if (msg) {
            setMsgs((prev) => [msg, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canalAtivo]);

  async function enviarMensagem(e: React.FormEvent) {
    e.preventDefault();
    if (!novaMensagem.trim()) return;

    const texto = novaMensagem.trim();
    setNovaMensagem("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("mensagens").insert({
          remetente_id: user.id,
          conteudo: texto,
          canal: canalAtivo,
        });
        // Realtime vai adicionar
        return;
      }
    } catch {
      // mock
    }

    // Mock mode
    setMsgs((prev) => [
      {
        id: `m${Date.now()}`,
        conteudo: texto,
        canal: canalAtivo,
        criado_em: new Date().toISOString(),
        perfis: { nome: "Voce (Admin)", perfil: "admin" },
      },
      ...prev,
    ]);
  }

  return (
    <div className="space-y-4">
      {/* Canais */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {canais.map((canal) => (
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
      <div className="space-y-3 min-h-[50vh]">
        {msgs.length === 0 ? (
          <p className="text-gray-500 text-sm text-center mt-10">
            Nenhuma mensagem neste canal ainda.
          </p>
        ) : (
          msgs.map((msg: any) => {
            const isAdmin = msg.perfis?.perfil === "admin";
            const isProf = msg.perfis?.perfil === "professor";
            return (
              <div key={msg.id} className="bg-dark-light rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gold">
                      {msg.perfis?.nome || msg.remetenteNome}
                    </p>
                    {(isAdmin || isProf) && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${isAdmin ? "bg-gold/20 text-gold" : "bg-blue-600/20 text-blue-400"}`}>
                        {isAdmin ? "Admin" : "Prof"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(msg.criado_em || msg.criadoEm).toLocaleDateString("pt-BR")}{" "}
                    {new Date(msg.criado_em || msg.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <p className="text-sm text-gray-300">{msg.conteudo}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={enviarMensagem}
        className="fixed bottom-16 left-0 right-0 bg-dark-light border-t border-gray-800 p-3"
      >
        <div className="flex gap-2 max-w-lg mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={novaMensagem}
            onChange={(e) => setNovaMensagem(e.target.value)}
            placeholder={`Mensagem para ${nomeCanal[canalAtivo]}...`}
            className="flex-1 px-4 py-2.5 rounded-lg bg-dark border border-gray-700 text-white text-sm focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-lg bg-gold text-black font-medium text-sm"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
