"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { nomeModalidade, formatarMoeda, diasDaSemanaCurto } from "@/lib/utils";

export default function AlunoDashboard() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<any>(null);
  const [aluno, setAluno] = useState<any>(null);
  const [minhasAulas, setMinhasAulas] = useState<any[]>([]);
  const [meusCheckins, setMeusCheckins] = useState<any[]>([]);
  const [pagPendente, setPagPendente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const hoje = new Date().getDay();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/me/aluno");
        if (!res.ok) {
          router.push("/");
          return;
        }
        const data = await res.json();
        setPerfil(data.perfil);
        setAluno(data.aluno);
        setMinhasAulas(data.aulas || []);
        setMeusCheckins(data.checkins || []);
        setPagPendente(data.pagPendente);
      } catch {
        router.push("/");
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Carregando...</p>
      </div>
    );
  }

  if (!aluno || !perfil) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <p className="text-gray-400">Dados do aluno nao encontrados.</p>
        <Link href="/" className="text-gold underline text-sm">Voltar ao login</Link>
      </div>
    );
  }

  const diasRestantes = aluno.data_fim_plano
    ? Math.max(0, Math.ceil((new Date(aluno.data_fim_plano).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-gold-dark flex items-center justify-center text-lg font-bold text-white">
          {perfil.nome.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <p className="text-sm text-gray-400">Bem-vindo de volta,</p>
          <h2 className="text-xl font-bold text-white">{perfil.nome.split(" ")[0]}</h2>
        </div>
      </div>

      <div className="bg-dark-light rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Meu Plano</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            aluno.status === "ativo" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
          }`}>
            {aluno.status.charAt(0).toUpperCase() + aluno.status.slice(1)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium capitalize">
              {aluno.planos?.nome || "Sem plano"}
            </p>
            <div className="flex gap-1.5 mt-1">
              {(aluno.modalidades || []).map((mod: string) => (
                <span key={mod} className="px-2 py-0.5 rounded text-xs bg-gold/20 text-gold">
                  {nomeModalidade(mod as any)}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gold">{diasRestantes}</p>
            <p className="text-xs text-gray-400">dias restantes</p>
          </div>
        </div>
        <div className="w-full bg-dark rounded-full h-2">
          <div
            className="bg-gold rounded-full h-2 transition-all"
            style={{ width: `${Math.max(5, Math.min(100, ((30 - diasRestantes) / 30) * 100))}%` }}
          />
        </div>
      </div>

      {pagPendente && (
        <Link href="/aluno/pagamentos" className="block bg-danger/10 border border-danger/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-danger font-medium text-sm">
                Pagamento {pagPendente.status === "atrasado" ? "atrasado" : "pendente"}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                Ref: {pagPendente.referencia} - Venc: {new Date(pagPendente.data_vencimento).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <p className="text-danger font-bold">{formatarMoeda(pagPendente.valor)}</p>
          </div>
        </Link>
      )}

      <section>
        <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
          Aulas de Hoje ({diasDaSemanaCurto(hoje)})
        </h3>
        {minhasAulas.length === 0 ? (
          <div className="bg-dark-light rounded-xl p-4 text-center">
            <p className="text-gray-500 text-sm">Nenhuma aula sua hoje.</p>
            <p className="text-gray-600 text-xs mt-1">Aproveite para descansar!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {minhasAulas.map((aula: any) => (
              <div key={aula.id} className="bg-dark-light rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{nomeModalidade(aula.modalidade)}</p>
                  <p className="text-sm text-gray-400">{aula.vagas} vagas</p>
                </div>
                <div className="text-right">
                  <p className="text-gold font-mono font-medium">{aula.hora_inicio?.slice(0, 5)}</p>
                  <p className="text-xs text-gray-500">ate {aula.hora_fim?.slice(0, 5)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Link
        href="/aluno/checkin"
        className="block w-full py-4 rounded-xl bg-gold text-black font-bold text-lg text-center active:bg-gold-dark transition-colors"
      >
        Fazer Check-in
      </Link>

      <section>
        <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
          Meus Ultimos Treinos
        </h3>
        {meusCheckins.length === 0 ? (
          <p className="text-gray-500 text-sm bg-dark-light rounded-xl p-4">Nenhum treino registrado.</p>
        ) : (
          <div className="space-y-2">
            {meusCheckins.map((ci: any) => (
              <div key={ci.id} className="bg-dark-light rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-white">{nomeModalidade(ci.modalidade)}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(ci.data_hora_entrada).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    {new Date(ci.data_hora_entrada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    {ci.data_hora_saida && ` - ${new Date(ci.data_hora_saida).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium ${
                    ci.validado ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                  }`}>
                    {ci.validado ? "Validado" : "Pendente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
