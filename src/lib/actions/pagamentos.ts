"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { criarCobrancaAsaas } from "@/lib/asaas";
import { revalidatePath } from "next/cache";

export async function listarPagamentos(filtros?: {
  status?: string;
  alunoId?: string;
}) {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("pagamentos")
    .select("*, alunos!inner(id, perfis!inner(nome))")
    .order("data_vencimento", { ascending: false });

  if (filtros?.status && filtros.status !== "todos") {
    query = query.eq("status", filtros.status);
  }

  if (filtros?.alunoId) {
    query = query.eq("aluno_id", filtros.alunoId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao listar pagamentos:", error);
    return [];
  }

  return data;
}

export async function criarPagamento(dados: {
  alunoId: string;
  valor: number;
  dataVencimento: string;
  referencia: string;
}) {
  const supabase = await createServerSupabase();

  // Verificar se aluno tem customer_id no Asaas
  const { data: aluno } = await supabase
    .from("alunos")
    .select("asaas_customer_id, perfis!inner(nome)")
    .eq("id", dados.alunoId)
    .single();

  let asaasPaymentId: string | null = null;
  let asaasInvoiceUrl: string | null = null;

  // Criar cobranca no Asaas se configurado
  if (
    aluno?.asaas_customer_id &&
    process.env.ASAAS_API_KEY &&
    process.env.ASAAS_API_KEY !== "sua-api-key-aqui"
  ) {
    try {
      const cobranca = await criarCobrancaAsaas({
        customerId: aluno.asaas_customer_id,
        valor: dados.valor,
        vencimento: dados.dataVencimento,
        descricao: `Gold Lion Academy - Ref: ${dados.referencia}`,
      });
      asaasPaymentId = cobranca.id;
      asaasInvoiceUrl = cobranca.invoiceUrl;
    } catch (err) {
      console.error("Erro ao criar cobranca no Asaas:", err);
    }
  }

  const { data, error } = await supabase
    .from("pagamentos")
    .insert({
      aluno_id: dados.alunoId,
      valor: dados.valor,
      data_vencimento: dados.dataVencimento,
      referencia: dados.referencia,
      status: "pendente",
      asaas_payment_id: asaasPaymentId,
      asaas_invoice_url: asaasInvoiceUrl,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/financeiro");
  return { data };
}

export async function registrarPagamentoManual(
  pagamentoId: string,
  formaPagamento: "pix" | "cartao" | "dinheiro" | "boleto"
) {
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("pagamentos")
    .update({
      status: "pago",
      data_pagamento: new Date().toISOString().split("T")[0],
      forma_pagamento: formaPagamento,
    })
    .eq("id", pagamentoId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/financeiro");
  return { success: true };
}

export async function cancelarPagamento(pagamentoId: string) {
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("pagamentos")
    .update({ status: "cancelado" })
    .eq("id", pagamentoId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/financeiro");
  return { success: true };
}

export async function resumoFinanceiro() {
  const supabase = await createServerSupabase();

  const mesAtual = new Date().toISOString().slice(0, 7); // "2026-03"

  const { data: pagamentos } = await supabase
    .from("pagamentos")
    .select("valor, status")
    .gte("data_vencimento", `${mesAtual}-01`)
    .lte("data_vencimento", `${mesAtual}-31`);

  const resumo = {
    recebido: 0,
    pendente: 0,
    atrasado: 0,
  };

  pagamentos?.forEach((p) => {
    if (p.status === "pago") resumo.recebido += Number(p.valor);
    if (p.status === "pendente") resumo.pendente += Number(p.valor);
    if (p.status === "atrasado") resumo.atrasado += Number(p.valor);
  });

  return resumo;
}
