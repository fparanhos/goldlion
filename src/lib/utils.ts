import { Modalidade, StatusAluno, StatusPagamento, Faixa } from "@/types";

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(data: string): string {
  return new Date(data).toLocaleDateString("pt-BR");
}

export function formatarDataHora(data: string): string {
  return new Date(data).toLocaleString("pt-BR");
}

export function nomeModalidade(mod: Modalidade): string {
  const nomes: Record<Modalidade, string> = {
    muaythai: "Muay Thai",
    boxe: "Boxe",
    jiujitsu: "Jiu-Jitsu",
  };
  return nomes[mod];
}

export function corModalidade(mod: Modalidade): string {
  const cores: Record<Modalidade, string> = {
    muaythai: "bg-red-600",
    boxe: "bg-blue-600",
    jiujitsu: "bg-purple-600",
  };
  return cores[mod];
}

export function corStatus(status: StatusAluno): string {
  const cores: Record<StatusAluno, string> = {
    ativo: "bg-success text-white",
    inadimplente: "bg-danger text-white",
    trancado: "bg-warning text-black",
    cancelado: "bg-gray-500 text-white",
  };
  return cores[status];
}

export function corStatusPagamento(status: StatusPagamento): string {
  const cores: Record<StatusPagamento, string> = {
    pago: "bg-success text-white",
    pendente: "bg-warning text-black",
    atrasado: "bg-danger text-white",
    cancelado: "bg-gray-500 text-white",
  };
  return cores[status];
}

export function corFaixa(faixa: Faixa): string {
  const cores: Record<Faixa, string> = {
    branca: "bg-white text-black",
    azul: "bg-blue-600 text-white",
    roxa: "bg-purple-600 text-white",
    marrom: "bg-amber-800 text-white",
    preta: "bg-black text-white",
    coral: "bg-red-400 text-white",
    vermelha: "bg-red-700 text-white",
  };
  return cores[faixa];
}

export function diasDaSemanaCurto(dia: number): string {
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  return dias[dia];
}
