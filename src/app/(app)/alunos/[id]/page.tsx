"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  nomeModalidade, corModalidade, corStatus, corFaixa,
  formatarData, formatarMoeda, corStatusPagamento,
} from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";

export default function AlunoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [aluno, setAluno] = useState<any>(null);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [checkinsAluno, setCheckinsAluno] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    async function fetchAluno() {
      try {
        const res = await fetch(`/api/alunos/${id}`);
        const data = await res.json();
        if (res.ok) {
          setAluno(data.aluno);
          setPagamentos(data.pagamentos || []);
          setCheckinsAluno(data.checkins || []);
        }
      } catch { /* */ }
      setLoading(false);
    }
    fetchAluno();
  }, [id]);

  async function alterarStatus(novoStatus: string) {
    try {
      await fetch(`/api/alunos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
    } catch { /* */ }
    setAluno((prev: any) => ({ ...prev, status: novoStatus }));
    setEditando(false);
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Carregando...</div>;
  }

  if (!aluno) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Aluno nao encontrado.</p>
        <button onClick={() => router.back()} className="mt-4 text-gold underline">Voltar</button>
      </div>
    );
  }

  const nome = aluno.perfis?.nome || aluno.nome || "—";
  const email = aluno.perfis?.email || aluno.email || "—";
  const telefone = aluno.perfis?.telefone || aluno.telefone || "—";
  const iniciais = nome.split(" ").map((n: string) => n[0]).join("").slice(0, 2);

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="text-gold text-sm flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
        </svg>
        Voltar
      </button>

      {/* Cabecalho */}
      <div className="bg-dark-light rounded-xl p-5 text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gold-dark flex items-center justify-center text-xl font-bold text-white">
          {iniciais}
        </div>
        <h2 className="text-lg font-bold">{nome}</h2>
        <p className="text-sm text-gray-400">{email}</p>
        <p className="text-sm text-gray-400">{telefone}</p>
        <div className="mt-3">
          <StatusBadge label={aluno.status} colorClass={corStatus(aluno.status)} />
        </div>
      </div>

      {/* Plano */}
      <section className="bg-dark-light rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Plano e Modalidades</h3>
        <div className="flex gap-1.5 flex-wrap">
          {(aluno.modalidades || []).map((mod: any) => (
            <span key={mod} className={`px-3 py-1 rounded-full text-xs text-white ${corModalidade(mod)}`}>
              {nomeModalidade(mod)}
            </span>
          ))}
        </div>
        {aluno.faixa && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Faixa:</span>
            <StatusBadge label={aluno.faixa.charAt(0).toUpperCase() + aluno.faixa.slice(1)} colorClass={corFaixa(aluno.faixa)} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-500">Plano</p>
            <p className="text-white capitalize">{aluno.planos?.nome || aluno.plano || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500">Vigencia</p>
            <p className="text-white">
              {formatarData(aluno.data_inicio_plano)} - {formatarData(aluno.data_fim_plano)}
            </p>
          </div>
        </div>
      </section>

      {/* Dados pessoais */}
      <section className="bg-dark-light rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Dados Pessoais</h3>
        <InfoRow label="CPF" value={aluno.cpf || "—"} />
        <InfoRow label="Nascimento" value={aluno.data_nascimento ? formatarData(aluno.data_nascimento) : "—"} />
        <InfoRow label="Emergencia" value={`${aluno.contato_emergencia || "—"} - ${aluno.telefone_emergencia || "—"}`} />
        <InfoRow label="Membro desde" value={formatarData(aluno.perfis?.criado_em)} />
      </section>

      {/* Pagamentos */}
      <section className="bg-dark-light rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Pagamentos</h3>
        {pagamentos.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum pagamento registrado.</p>
        ) : (
          pagamentos.map((pag: any) => (
            <div key={pag.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div>
                <p className="text-sm">{formatarMoeda(Number(pag.valor))}</p>
                <p className="text-xs text-gray-400">Ref: {pag.referencia}</p>
              </div>
              <StatusBadge label={pag.status} colorClass={corStatusPagamento(pag.status)} />
            </div>
          ))
        )}
      </section>

      {/* Check-ins */}
      <section className="bg-dark-light rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Check-ins ({checkinsAluno.length})
        </h3>
        {checkinsAluno.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum check-in registrado.</p>
        ) : (
          checkinsAluno.slice(0, 5).map((ci: any) => (
            <div key={ci.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div>
                <p className="text-sm">{nomeModalidade(ci.modalidade)}</p>
                <p className="text-xs text-gray-400">{new Date(ci.data_hora_entrada).toLocaleString("pt-BR")}</p>
              </div>
              <StatusBadge label={ci.validado ? "OK" : "Pendente"} colorClass={ci.validado ? "bg-success text-white" : "bg-warning text-black"} />
            </div>
          ))
        )}
      </section>

      {/* Acoes */}
      <div className="space-y-2">
        {aluno.status === "pendente" && (
          <button
            onClick={() => alterarStatus("ativo")}
            className="w-full py-3 rounded-lg bg-success text-white font-bold text-sm"
          >
            Aprovar Cadastro
          </button>
        )}

        {!editando ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setEditando(true)}
                className="py-3 rounded-lg bg-gold text-black font-medium text-sm"
              >
                Alterar Status
              </button>
              <button
                onClick={() => { if (confirm("Desativar este aluno?")) alterarStatus("cancelado"); }}
                className="py-3 rounded-lg border border-danger text-danger font-medium text-sm"
              >
                Desativar
              </button>
            </div>
            <button
              onClick={async () => {
                if (!confirm("Resetar a senha deste aluno para 123456?")) return;
                try {
                  const res = await fetch(`/api/alunos/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ resetSenha: true }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert("Senha resetada para 123456. O aluno devera trocar no proximo login.");
                  } else {
                    alert("Erro: " + (data.error || "Falha ao resetar"));
                  }
                } catch {
                  alert("Erro ao resetar senha");
                }
              }}
              className="w-full py-3 rounded-lg border border-warning text-warning font-medium text-sm"
            >
              Resetar Senha
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Alterar status para:</p>
            <div className="grid grid-cols-2 gap-2">
              {(["pendente", "ativo", "inadimplente", "trancado", "cancelado"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => alterarStatus(s)}
                  className={`py-2 rounded-lg text-sm font-medium ${corStatus(s)}`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={() => setEditando(false)} className="w-full py-2 text-gray-400 text-sm">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-white text-right">{value}</span>
    </div>
  );
}
