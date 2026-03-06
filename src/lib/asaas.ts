const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || "https://sandbox.asaas.com/api/v3";
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";

async function asaasRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Asaas API error: ${res.status} - ${error}`);
  }

  return res.json();
}

// Criar cliente no Asaas
export async function criarClienteAsaas(dados: {
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
}) {
  return asaasRequest("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: dados.nome,
      cpfCnpj: dados.cpf.replace(/\D/g, ""),
      email: dados.email,
      mobilePhone: dados.telefone?.replace(/\D/g, ""),
    }),
  });
}

// Criar cobranca no Asaas
export async function criarCobrancaAsaas(dados: {
  customerId: string;
  valor: number;
  vencimento: string; // YYYY-MM-DD
  descricao: string;
}) {
  return asaasRequest("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: dados.customerId,
      billingType: "UNDEFINED", // permite pix, boleto, cartao
      value: dados.valor,
      dueDate: dados.vencimento,
      description: dados.descricao,
      postalService: false,
    }),
  });
}

// Criar cobranca recorrente (subscription)
export async function criarAssinaturaAsaas(dados: {
  customerId: string;
  valor: number;
  ciclo: "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";
  proximoVencimento: string;
  descricao: string;
}) {
  return asaasRequest("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: dados.customerId,
      billingType: "UNDEFINED",
      value: dados.valor,
      cycle: dados.ciclo,
      nextDueDate: dados.proximoVencimento,
      description: dados.descricao,
    }),
  });
}

// Buscar link de pagamento de uma cobranca
export async function buscarCobrancaAsaas(paymentId: string) {
  return asaasRequest(`/payments/${paymentId}`);
}

// Cancelar cobranca
export async function cancelarCobrancaAsaas(paymentId: string) {
  return asaasRequest(`/payments/${paymentId}`, {
    method: "DELETE",
  });
}
