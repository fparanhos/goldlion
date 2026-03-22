"use client";

import { useState, useEffect, useRef } from "react";
import { formatarMoeda } from "@/lib/utils";

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pago: { label: "Pago", bg: "bg-success/20", text: "text-success" },
  pendente: { label: "Pendente", bg: "bg-warning/20", text: "text-warning" },
  atrasado: { label: "Atrasado", bg: "bg-danger/20", text: "text-danger" },
  cancelado: { label: "Cancelado", bg: "bg-gray-500/20", text: "text-gray-500" },
};

export default function AlunoPagamentosPage() {
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [aluno, setAluno] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pagSelecionado, setPagSelecionado] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, pagsRes] = await Promise.all([
          fetch("/api/me/aluno"),
          fetch("/api/me/aluno/pagamentos"),
        ]);

        const meData = await meRes.json();
        const pagsData = await pagsRes.json();

        if (meData.aluno) setAluno(meData.aluno);
        if (pagsData.pagamentos) setPagamentos(pagsData.pagamentos);
      } catch {
        /* */
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  function abrirUpload(pagId: string) {
    setPagSelecionado(pagId);
    setErro("");
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pagSelecionado) return;

    // Validar tipo e tamanho
    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!tiposPermitidos.includes(file.type)) {
      setErro("Envie uma imagem (JPG, PNG, WebP) ou PDF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErro("O arquivo deve ter no maximo 5MB");
      return;
    }

    setEnviando(pagSelecionado);
    setErro("");

    try {
      const formData = new FormData();
      formData.append("pagamentoId", pagSelecionado);
      formData.append("comprovante", file);

      const res = await fetch("/api/me/aluno/pagamentos", {
        method: "PUT",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao enviar comprovante");
        setEnviando(null);
        return;
      }

      // Atualizar estado local
      setPagamentos((prev) =>
        prev.map((p) =>
          p.id === pagSelecionado
            ? { ...p, comprovante_url: data.comprovanteUrl, sinalizado_em: new Date().toISOString() }
            : p
        )
      );
      setSucesso(pagSelecionado);
      setTimeout(() => setSucesso(null), 3000);
    } catch {
      setErro("Erro ao enviar comprovante");
    }

    setEnviando(null);
    setPagSelecionado(null);
    // Limpar input para permitir reenvio
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Carregando...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Input oculto para upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Resumo do plano */}
      {aluno && (
        <div className="bg-dark-light rounded-xl p-5 text-center">
          <p className="text-sm text-gray-400">Plano Atual</p>
          <p className="text-white font-bold text-lg mt-1">
            {aluno.planos?.nome || "Sem plano"}
          </p>
          <div className="flex gap-1.5 justify-center mt-2">
            {(aluno.modalidades || []).map((mod: string) => (
              <span key={mod} className="px-2 py-0.5 rounded text-xs bg-gold/20 text-gold capitalize">
                {mod === "muaythai" ? "Muay Thai" : mod === "jiujitsu" ? "Jiu-Jitsu" : mod.charAt(0).toUpperCase() + mod.slice(1)}
              </span>
            ))}
          </div>
          {aluno.data_inicio_plano && (
            <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Inicio</p>
                <p className="text-sm text-white">{new Date(aluno.data_inicio_plano).toLocaleDateString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vencimento</p>
                <p className="text-sm text-white">{new Date(aluno.data_fim_plano).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Erro global */}
      {erro && (
        <div className="bg-danger/20 border border-danger/30 rounded-lg p-3">
          <p className="text-danger text-sm">{erro}</p>
        </div>
      )}

      {/* Lista de pagamentos */}
      <section>
        <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
          Historico de Pagamentos
        </h3>
        <div className="space-y-3">
          {pagamentos.length === 0 ? (
            <p className="text-gray-500 text-sm bg-dark-light rounded-xl p-4 text-center">
              Nenhum pagamento registrado.
            </p>
          ) : (
            pagamentos.map((pag) => {
              const cfg = statusConfig[pag.status] || statusConfig.pendente;
              const jaSinalizado = !!pag.sinalizado_em;
              const isEnviando = enviando === pag.id;
              const isSucesso = sucesso === pag.id;

              return (
                <div key={pag.id} className="bg-dark-light rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Ref: {pag.referencia}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Venc: {new Date(pag.data_vencimento).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gold font-bold">{formatarMoeda(Number(pag.valor))}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Pagamento confirmado */}
                  {pag.status === "pago" && pag.data_pagamento && (
                    <p className="text-xs text-gray-500">
                      Pago em {new Date(pag.data_pagamento).toLocaleDateString("pt-BR")}
                      {pag.forma_pagamento && ` via ${pag.forma_pagamento.toUpperCase()}`}
                    </p>
                  )}

                  {/* Ja sinalizou, aguardando aprovacao */}
                  {pag.status !== "pago" && jaSinalizado && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-orange-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-orange-400 text-sm font-medium">Comprovante enviado</p>
                      </div>
                      <p className="text-xs text-gray-400">
                        Enviado em {new Date(pag.sinalizado_em).toLocaleDateString("pt-BR")} - Aguardando confirmacao do professor
                      </p>
                      {/* Botao para reenviar comprovante */}
                      <button
                        onClick={() => abrirUpload(pag.id)}
                        disabled={isEnviando}
                        className="w-full py-2 rounded-lg border border-orange-500/40 text-orange-400 text-xs font-medium disabled:opacity-50"
                      >
                        {isEnviando ? "Enviando..." : "Reenviar comprovante"}
                      </button>
                    </div>
                  )}

                  {/* Pendente/Atrasado sem comprovante - botao de enviar */}
                  {(pag.status === "pendente" || pag.status === "atrasado") && !jaSinalizado && (
                    <>
                      {isSucesso ? (
                        <div className="flex items-center gap-2 py-2 justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-success">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          <span className="text-success text-sm font-medium">Comprovante enviado!</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => abrirUpload(pag.id)}
                          disabled={isEnviando}
                          className="w-full py-2.5 rounded-lg bg-gold text-black font-medium text-sm active:bg-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isEnviando ? (
                            "Enviando..."
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                              </svg>
                              Enviar Comprovante
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
