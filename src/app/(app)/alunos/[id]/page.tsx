"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { alunos as mockAlunos, pagamentos as mockPags, checkins as mockCheckins } from "@/lib/mock-data";
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
  const [statusEdit, setStatusEdit] = useState("");

  useEffect(() => {
    async function fetch() {
      try {
        const supabase = createClient();

        const [alunoRes, pagsRes, ciRes] = await Promise.all([
          supabase
            .from("alunos")
            .select("*, perfis!inner(nome, email, telefone, foto_url, criado_em), planos(nome, tipo, valor)")
            .eq("id", id)
            .single(),
          supabase
            .from("pagamentos")
            .select("*")
            .eq("aluno_id", id)
            .order("data_vencimento", { ascending: false }),
          supabase
            .from("checkins")
            .select("*")
            .eq("aluno_id", id)
            .order("data_hora_entrada", { ascending: false })
            .limit(10),
        ]);

        if (alunoRes.error) throw alunoRes.error;

        setAluno(alunoRes.data);
        setPagamentos(pagsRes.data || []);
        setCheckinsAluno(ciRes.data || []);
      } catch {
        // Mock
        const mock = mockAlunos.find((a) => a.id === id);
        if (mock) {
          setAluno({
            ...mock,
            perfis: { nome: mock.nome, email: mock.email, telefone: mock.telefone, criado_em: mock.criadoEm },
            data_nascimento: mock.dataNascimento,
            contato_emergencia: mock.contatoEmergencia,
            telefone_emergencia: mock.telefoneEmergencia,
            data_inicio_plano: mock.dataInicioPlano,
            data_fim_plano: mock.dataFimPlano,
          });
          setPagamentos(mockPags.filter((p) => p.alunoId === id).map((p) => ({
            ...p, data_vencimento: p.dataVencimento, data_pagamento: p.dataPagamento, forma_pagamento: p.formaPagamento,
          })));
          setCheckinsAluno(mockCheckins.filter((c) => c.alunoId === id).map((c) => ({
            ...c, data_hora_entrada: c.dataHoraEntrada, data_hora_saida: c.dataHoraSaida,
          })));
        }
      }
      setLoading(false);
    }
    fetch();
  }, [id]);

  async function alterarStatus(novoStatus: string) {
    try {
      const supabase = createClient();
      await supabase.from("alunos").update({ status: novoStatus }).eq("id", id);
    } catch { /* mock */ }
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

  const nome = aluno.perfis?.nome || aluno.nome;
  const email = aluno.perfis?.email || aluno.email;
  const telefone = aluno.perfis?.telefone || aluno.telefone;
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
          {aluno.modalidades.map((mod: any) => (
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
            <p className="text-white capitalize">{aluno.planos?.nome || aluno.plano}</p>
          </div>
          <div>
            <p className="text-gray-500">Vigencia</p>
            <p className="text-white">
              {formatarData(aluno.data_inicio_plano || aluno.dataInicioPlano)} - {formatarData(aluno.data_fim_plano || aluno.dataFimPlano)}
            </p>
          </div>
        </div>
      </section>

      {/* Dados pessoais */}
      <section className="bg-dark-light rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Dados Pessoais</h3>
        <InfoRow label="CPF" value={aluno.cpf || "-"} />
        <InfoRow label="Nascimento" value={aluno.data_nascimento ? formatarData(aluno.data_nascimento) : "-"} />
        <InfoRow label="Emergencia" value={`${aluno.contato_emergencia || "-"} - ${aluno.telefone_emergencia || "-"}`} />
        <InfoRow label="Membro desde" value={formatarData(aluno.perfis?.criado_em || aluno.criadoEm)} />
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
        {!editando ? (
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
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Alterar status para:</p>
            <div className="grid grid-cols-2 gap-2">
              {(["ativo", "inadimplente", "trancado", "cancelado"] as const).map((s) => (
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
