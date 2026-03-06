import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Usar service role para bypass RLS no webhook
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, payment } = body;

    if (!event || !payment) {
      return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
    }

    const supabase = createAdminClient();

    switch (event) {
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED": {
        // Pagamento confirmado - atualizar status
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
