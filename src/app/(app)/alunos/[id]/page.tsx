"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  nomeModalidade, corModalidade, corStatus, corFaixa,
  formatarData, formatarMoeda, corStatusPagamento,
} from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import type { Modalidade } from "@/types";

export default function AlunoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [aluno, setAluno] = useState<any>(null);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [checkinsAluno, setCheckinsAluno] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [editandoStatus, setEditandoStatus] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [planos, setPlanos] = useState<any[]>([]);

  // Form de edicao
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    cpf: "",
    dataNascimento: "",
    contatoEmergencia: "",
    telefoneEmergencia: "",
    modalidades: [] as Modalidade[],
    planoId: "",
    faixa: "",
    observacoes: "",
    dataInicioPlano: "",
    dataFimPlano: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [alunoRes, planosRes] = await Promise.all([
          fetch(`/api/alunos/${id}`),
          fetch("/api/planos"),
        ]);
        const alunoData = await alunoRes.json();
        const planosData = await planosRes.json();

        if (alunoRes.ok && alunoData.aluno) {
          setAluno(alunoData.aluno);
          setPagamentos(alunoData.pagamentos || []);
          setCheckinsAluno(alunoData.checkins || []);
          preencherForm(alunoData.aluno);
        }
        if (Array.isArray(planosData)) {
          setPlanos(planosData.filter((p: any) => p.ativo));
        }
      } catch { /* */ }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  function preencherForm(a: any) {
    setForm({
      nome: a.perfis?.nome || "",
      telefone: a.perfis?.telefone || "",
      cpf: a.cpf || "",
      dataNascimento: a.data_nascimento || "",
      contatoEmergencia: a.contato_emergencia || "",
      telefoneEmergencia: a.telefone_emergencia || "",
      modalidades: a.modalidades || [],
      planoId: a.plano_id || "",
      faixa: a.faixa || "",
      observacoes: a.observacoes || "",
      dataInicioPlano: a.data_inicio_plano || "",
      dataFimPlano: a.data_fim_plano || "",
    });
  }

  function toggleModalidade(mod: Modalidade) {
    setForm((prev) => ({
      ...prev,
      modalidades: prev.modalidades.includes(mod)
        ? prev.modalidades.filter((m) => m !== mod)
        : [...prev.modalidades, mod],
    }));
  }

  async function salvarEdicao() {
    if (!form.nome || form.modalidades.length === 0) {
      setErro("Nome e ao menos uma modalidade sao obrigatorios");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      const res = await fetch(`/api/alunos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          telefone: form.telefone,
          cpf: form.cpf,
          dataNascimento: form.dataNascimento,
          contatoEmergencia: form.contatoEmergencia,
          telefoneEmergencia: form.telefoneEmergencia,
          modalidades: form.modalidades,
          planoId: form.planoId,
          faixa: form.faixa,
          observacoes: form.observacoes,
          dataInicioPlano: form.dataInicioPlano,
          dataFimPlano: form.dataFimPlano,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Erro ao salvar");
        setSalvando(false);
        return;
      }

      // Atualizar dados locais
      setAluno((prev: any) => ({
        ...prev,
        perfis: { ...prev.perfis, nome: form.nome, telefone: form.telefone },
        cpf: form.cpf,
        data_nascimento: form.dataNascimento,
        contato_emergencia: form.contatoEmergencia,
        telefone_emergencia: form.telefoneEmergencia,
        modalidades: form.modalidades,
        plano_id: form.planoId,
        faixa: form.faixa || null,
        observacoes: form.observacoes,
        data_inicio_plano: form.dataInicioPlano,
        data_fim_plano: form.dataFimPlano,
        planos: planos.find((p) => p.id === form.planoId) || prev.planos,
      }));
      setEditando(false);
    } catch {
      setErro("Erro ao salvar alteracoes");
    }
    setSalvando(false);
  }

  async function alterarStatus(novoStatus: string) {
    try {
      await fetch(`/api/alunos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
    } catch { /* */ }
    setAluno((prev: any) => ({ ...prev, status: novoStatus }));
    setEditandoStatus(false);
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
  const iniciais = (nome || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2);

  // Modo edicao
  if (editando) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => { setEditando(false); preencherForm(aluno); }} className="text-gold text-sm flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Cancelar
          </button>
          <h2 className="text-gold font-bold">Editar Aluno</h2>
        </div>

        {erro && (
          <div className="bg-danger/20 border border-danger/30 rounded-lg p-3">
            <p className="text-danger text-sm">{erro}</p>
          </div>
        )}

        <div className="space-y-3">
          <Field label="Nome completo">
            <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input-field" />
          </Field>

          <Field label="Telefone">
            <input type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="input-field" placeholder="(11) 99999-0000" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="CPF">
              <input type="text" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} className="input-field" />
            </Field>
            <Field label="Data de Nascimento">
              <input type="date" value={form.dataNascimento} onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })} className="input-field" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contato Emergencia">
              <input type="text" value={form.contatoEmergencia} onChange={(e) => setForm({ ...form, contatoEmergencia: e.target.value })} className="input-field" />
            </Field>
            <Field label="Tel. Emergencia">
              <input type="tel" value={form.telefoneEmergencia} onChange={(e) => setForm({ ...form, telefoneEmergencia: e.target.value })} className="input-field" />
            </Field>
          </div>

          <Field label="Modalidades">
            <div className="flex gap-2 flex-wrap">
              {(["muaythai", "boxe", "jiujitsu"] as const).map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => toggleModalidade(mod)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.modalidades.includes(mod)
                      ? "bg-gold text-black"
                      : "bg-dark-light text-gray-400 border border-gray-700"
                  }`}
                >
                  {nomeModalidade(mod)}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Plano">
            <select value={form.planoId} onChange={(e) => setForm({ ...form, planoId: e.target.value })} className="input-field">
              <option value="">Sem plano</option>
              {planos.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nome} - R$ {Number(p.valor).toFixed(2)}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Inicio do Plano">
              <input type="date" value={form.dataInicioPlano} onChange={(e) => setForm({ ...form, dataInicioPlano: e.target.value })} className="input-field" />
            </Field>
            <Field label="Fim do Plano">
              <input type="date" value={form.dataFimPlano} onChange={(e) => setForm({ ...form, dataFimPlano: e.target.value })} className="input-field" />
            </Field>
          </div>

          {form.modalidades.includes("jiujitsu") && (
            <Field label="Faixa (Jiu-Jitsu)">
              <select value={form.faixa} onChange={(e) => setForm({ ...form, faixa: e.target.value })} className="input-field">
                <option value="">Selecione</option>
                {["branca", "azul", "roxa", "marrom", "preta", "coral", "vermelha"].map((f) => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Observacoes">
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              className="input-field min-h-[80px]"
              placeholder="Anotacoes sobre o aluno..."
            />
          </Field>
        </div>

        <button
          onClick={salvarEdicao}
          disabled={salvando}
          className="w-full py-3 rounded-lg bg-gold text-black font-bold text-sm disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar Alteracoes"}
        </button>
      </div>
    );
  }

  // Modo visualizacao
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
            <p className="text-white capitalize">{aluno.planos?.nome || "Sem plano"}</p>
          </div>
          <div>
            <p className="text-gray-500">Vigencia</p>
            <p className="text-white">
              {aluno.data_inicio_plano ? formatarData(aluno.data_inicio_plano) : "—"} - {aluno.data_fim_plano ? formatarData(aluno.data_fim_plano) : "—"}
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
        <InfoRow label="Membro desde" value={aluno.perfis?.criado_em ? formatarData(aluno.perfis.criado_em) : "—"} />
        {aluno.observacoes && <InfoRow label="Obs" value={aluno.observacoes} />}
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

        <button
          onClick={() => setEditando(true)}
          className="w-full py-3 rounded-lg bg-gold text-black font-bold text-sm"
        >
          Editar Dados
        </button>

        {!editandoStatus ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setEditandoStatus(true)}
              className="py-3 rounded-lg bg-dark-light border border-gray-700 text-gray-300 font-medium text-sm"
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
            <button onClick={() => setEditandoStatus(false)} className="w-full py-2 text-gray-400 text-sm">
              Cancelar
            </button>
          </div>
        )}

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
