import type { SupabaseClient } from "@supabase/supabase-js";
import { criarCobrancaAsaas } from "@/lib/asaas";

/**
 * Próximo vencimento = mesmo dia do mês seguinte da data base.
 * Se o dia não existir no mês seguinte (ex: 31/01 → fev),
 * usa o último dia do mês seguinte (28 ou 29/02).
 */
export function calcularProximoVencimento(dataBase: Date): Date {
  const ano = dataBase.getFullYear();
  const mesProximo = dataBase.getMonth() + 1;
  const dia = dataBase.getDate();

  // Último dia do mês seguinte (truque: dia 0 do mês seguinte ao seguinte)
  const ultimoDiaMesProx = new Date(ano, mesProximo + 1, 0).getDate();
  const diaFinal = Math.min(dia, ultimoDiaMesProx);

  return new Date(ano, mesProximo, diaFinal);
}

export function referenciaMesAno(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${mes}/${data.getFullYear()}`;
}

function dataParaIsoYmd(data: Date): string {
  return data.toISOString().split("T")[0];
}

/**
 * Gera a próxima mensalidade do aluno baseada numa data de referência.
 *
 * Idempotente: se já existe pagamento na mesma referência (mês/ano),
 * retorna esse pagamento sem criar duplicado.
 *
 * Faz best-effort de criar cobrança no Asaas; se falhar o pagamento
 * é criado no DB mesmo assim e a falha é apenas logada.
 */
export async function gerarProximaMensalidade(
  supabase: SupabaseClient,
  alunoId: string,
  dataBase: Date,
): Promise<{ pagamento: unknown | null; criado: boolean; erro?: string }> {
  const proximaData = calcularProximoVencimento(dataBase);
  const referencia = referenciaMesAno(proximaData);

  const { data: existente } = await supabase
    .from("pagamentos")
    .select("id, status")
    .eq("aluno_id", alunoId)
    .eq("referencia", referencia)
    .limit(1);

  if (existente && existente.length > 0) {
    return { pagamento: existente[0], criado: false };
  }

  const { data: aluno } = await supabase
    .from("alunos")
    .select("plano_id, asaas_customer_id, planos(valor)")
    .eq("id", alunoId)
    .single();

  if (!aluno?.plano_id) {
    return { pagamento: null, criado: false, erro: "Aluno sem plano vinculado" };
  }

  const valor = (aluno as { planos?: { valor?: number } }).planos?.valor;
  if (!valor) {
    return { pagamento: null, criado: false, erro: "Plano sem valor configurado" };
  }

  let asaasPaymentId: string | null = null;
  let asaasInvoiceUrl: string | null = null;

  const asaasConfigurado =
    aluno.asaas_customer_id &&
    process.env.ASAAS_API_KEY &&
    process.env.ASAAS_API_KEY !== "sua-api-key-aqui";

  if (asaasConfigurado) {
    try {
      const cobranca = await criarCobrancaAsaas({
        customerId: aluno.asaas_customer_id as string,
        valor,
        vencimento: dataParaIsoYmd(proximaData),
        descricao: `Gold Lion Academy - Ref: ${referencia}`,
      });
      asaasPaymentId = cobranca.id;
      asaasInvoiceUrl = cobranca.invoiceUrl;
    } catch (err) {
      console.error("[mensalidades] falha ao criar cobranca Asaas:", err);
    }
  }

  const { data: novo, error } = await supabase
    .from("pagamentos")
    .insert({
      aluno_id: alunoId,
      valor,
      data_vencimento: dataParaIsoYmd(proximaData),
      referencia,
      status: "pendente",
      asaas_payment_id: asaasPaymentId,
      asaas_invoice_url: asaasInvoiceUrl,
    })
    .select()
    .single();

  if (error) {
    return { pagamento: null, criado: false, erro: error.message };
  }

  return { pagamento: novo, criado: true };
}

/**
 * Gera a PRIMEIRA mensalidade do aluno (após admin aprovar ou criar ativo).
 *
 * Diferença vs gerarProximaMensalidade: usa a data de hoje como base e só
 * cria se o aluno ainda não tem nenhum pagamento (qualquer status).
 */
export async function gerarPrimeiraMensalidadeSeNecessario(
  supabase: SupabaseClient,
  alunoId: string,
): Promise<{ pagamento: unknown | null; criado: boolean; erro?: string }> {
  const { count } = await supabase
    .from("pagamentos")
    .select("id", { count: "exact", head: true })
    .eq("aluno_id", alunoId);

  if ((count ?? 0) > 0) {
    return { pagamento: null, criado: false };
  }

  return gerarProximaMensalidade(supabase, alunoId, new Date());
}
