"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { criarClienteAsaas } from "@/lib/asaas";
import { revalidatePath } from "next/cache";

export async function listarAlunos(filtros?: {
  busca?: string;
  modalidade?: string;
  status?: string;
}) {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("alunos")
    .select("*, perfis!inner(nome, email, telefone, foto_url)")
    .order("perfis(nome)");

  if (filtros?.status && filtros.status !== "todos") {
    query = query.eq("status", filtros.status);
  }

  if (filtros?.modalidade && filtros.modalidade !== "todas") {
    query = query.contains("modalidades", [filtros.modalidade]);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao listar alunos:", error);
    return [];
  }

  // Filtro de busca no client (Supabase nao suporta ilike em join)
  if (filtros?.busca) {
    const busca = filtros.busca.toLowerCase();
    return data.filter((a: any) =>
      a.perfis.nome.toLowerCase().includes(busca)
    );
  }

  return data;
}

export async function buscarAluno(id: string) {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("alunos")
    .select("*, perfis!inner(nome, email, telefone, foto_url, criado_em), planos(nome, tipo, valor)")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao buscar aluno:", error);
    return null;
  }

  return data;
}

export async function criarAluno(dados: {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  cpf?: string;
  dataNascimento?: string;
  contatoEmergencia?: string;
  telefoneEmergencia?: string;
  modalidades: string[];
  planoId?: string;
  observacoes?: string;
}) {
  const supabase = await createServerSupabase();

  // 1. Criar usuario no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: dados.email,
    password: dados.senha,
    email_confirm: true,
    user_metadata: {
      nome: dados.nome,
      perfil: "aluno",
    },
  });

  if (authError) {
    return { error: `Erro ao criar usuario: ${authError.message}` };
  }

  const userId = authData.user.id;

  // 2. Atualizar perfil com telefone
  await supabase
    .from("perfis")
    .update({ telefone: dados.telefone })
    .eq("id", userId);

  // 3. Calcular data fim do plano
  let dataFimPlano: string | null = null;
  let planoInfo = null;
  if (dados.planoId) {
    const { data: plano } = await supabase
      .from("planos")
      .select("*")
      .eq("id", dados.planoId)
      .single();

    if (plano) {
      planoInfo = plano;
      const inicio = new Date();
      const meses: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };
      const fim = new Date(inicio);
      fim.setMonth(fim.getMonth() + (meses[plano.tipo] || 1));
      dataFimPlano = fim.toISOString().split("T")[0];
    }
  }

  // 4. Criar registro do aluno
  const { error: alunoError } = await supabase.from("alunos").insert({
    id: userId,
    cpf: dados.cpf || null,
    data_nascimento: dados.dataNascimento || null,
    contato_emergencia: dados.contatoEmergencia || null,
    telefone_emergencia: dados.telefoneEmergencia || null,
    modalidades: dados.modalidades as any,
    plano_id: dados.planoId || null,
    status: "ativo",
    data_inicio_plano: new Date().toISOString().split("T")[0],
    data_fim_plano: dataFimPlano,
    observacoes: dados.observacoes || null,
  });

  if (alunoError) {
    return { error: `Erro ao criar aluno: ${alunoError.message}` };
  }

  // 5. Criar cliente no Asaas (se tiver CPF e API key configurada)
  if (dados.cpf && process.env.ASAAS_API_KEY && process.env.ASAAS_API_KEY !== "sua-api-key-aqui") {
    try {
      const clienteAsaas = await criarClienteAsaas({
        nome: dados.nome,
        cpf: dados.cpf,
        email: dados.email,
        telefone: dados.telefone,
      });

      await supabase
        .from("alunos")
        .update({ asaas_customer_id: clienteAsaas.id })
        .eq("id", userId);
    } catch (err) {
      console.error("Erro ao criar cliente no Asaas:", err);
      // Nao bloqueia o cadastro
    }
  }

  revalidatePath("/alunos");
  return { data: { id: userId } };
}

export async function atualizarAluno(
  id: string,
  dados: {
    nome?: string;
    telefone?: string;
    cpf?: string;
    dataNascimento?: string;
    contatoEmergencia?: string;
    telefoneEmergencia?: string;
    modalidades?: string[];
    planoId?: string;
    status?: string;
    faixa?: string;
    observacoes?: string;
  }
) {
  const supabase = await createServerSupabase();

  // Atualizar perfil
  if (dados.nome || dados.telefone) {
    await supabase
      .from("perfis")
      .update({
        ...(dados.nome && { nome: dados.nome }),
        ...(dados.telefone && { telefone: dados.telefone }),
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", id);
  }

  // Atualizar dados do aluno
  const updateData: Record<string, any> = {};
  if (dados.cpf !== undefined) updateData.cpf = dados.cpf;
  if (dados.dataNascimento !== undefined) updateData.data_nascimento = dados.dataNascimento;
  if (dados.contatoEmergencia !== undefined) updateData.contato_emergencia = dados.contatoEmergencia;
  if (dados.telefoneEmergencia !== undefined) updateData.telefone_emergencia = dados.telefoneEmergencia;
  if (dados.modalidades !== undefined) updateData.modalidades = dados.modalidades;
  if (dados.planoId !== undefined) updateData.plano_id = dados.planoId;
  if (dados.status !== undefined) updateData.status = dados.status;
  if (dados.faixa !== undefined) updateData.faixa = dados.faixa;
  if (dados.observacoes !== undefined) updateData.observacoes = dados.observacoes;

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from("alunos")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/alunos");
  revalidatePath(`/alunos/${id}`);
  return { success: true };
}

export async function desativarAluno(id: string) {
  return atualizarAluno(id, { status: "cancelado" });
}
