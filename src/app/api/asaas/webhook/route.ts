import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/lib/auth/api";
import { gerarProximaMensalidade } from "@/lib/mensalidades";

// O Asaas envia no header `asaas-access-token` o token cadastrado na
// configuracao do webhook (painel Asaas > Integracoes > Webhooks).
// Sem ASAAS_WEBHOOK_TOKEN configurado, todas as chamadas sao recusadas.
function tokenValido(recebido: string | null): boolean {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!tokenValido(request.headers.get("asaas-access-token"))) {
    console.warn("[webhook Asaas] chamada recusada: token ausente ou invalido");
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { event, payment } = body;

    if (!event || !payment) {
      return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    switch (event) {
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED": {
        const { data: pagAtual } = await supabase
          .from("pagamentos")
          .select("id, aluno_id, data_vencimento")
          .eq("asaas_payment_id", payment.id)
          .single();

        const { error } = await supabase
          .from("pagamentos")
          .update({
            status: "pago",
            data_pagamento: payment.paymentDate || new Date().toISOString().split("T")[0],
            forma_pagamento: mapBillingType(payment.billingType),
          })
          .eq("asaas_payment_id", payment.id);

        if (error) {
          console.error("Erro ao atualizar pagamento:", error);
        }

        // Reativar aluno se estava inadimplente
        if (payment.customer) {
          await supabase
            .from("alunos")
            .update({ status: "ativo" })
            .eq("asaas_customer_id", payment.customer)
            .eq("status", "inadimplente");
        }

        // Gerar próxima mensalidade (idempotente)
        if (pagAtual) {
          const base = new Date(`${pagAtual.data_vencimento}T00:00:00`);
          const r = await gerarProximaMensalidade(supabase, pagAtual.aluno_id, base);
          if (r.erro && r.erro !== "Aluno sem plano vinculado") {
            console.error("[webhook Asaas] falha ao gerar proxima mensalidade:", r.erro);
          }
        }
        break;
      }

      case "PAYMENT_OVERDUE": {
        // Pagamento atrasado
        await supabase
          .from("pagamentos")
          .update({ status: "atrasado" })
          .eq("asaas_payment_id", payment.id);

        // Marcar aluno como inadimplente
        if (payment.customer) {
          await supabase
            .from("alunos")
            .update({ status: "inadimplente" })
            .eq("asaas_customer_id", payment.customer);
        }
        break;
      }

      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED": {
        await supabase
          .from("pagamentos")
          .update({ status: "cancelado" })
          .eq("asaas_payment_id", payment.id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Erro no webhook Asaas:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

function mapBillingType(type: string): "pix" | "cartao" | "boleto" | "dinheiro" {
  const map: Record<string, "pix" | "cartao" | "boleto" | "dinheiro"> = {
    PIX: "pix",
    CREDIT_CARD: "cartao",
    BOLETO: "boleto",
    DEBIT_CARD: "cartao",
    TRANSFER: "pix",
    DEPOSIT: "dinheiro",
  };
  return map[type] || "pix";
}
