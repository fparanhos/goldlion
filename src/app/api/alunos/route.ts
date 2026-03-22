import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const pagina = parseInt(searchParams.get("pagina") || "0");
  const porPagina = parseInt(searchParams.get("porPagina") || "20");
  const modalidade = searchParams.get("modalidade");
  const busca = searchParams.get("busca");

  try {
    // Total count
    let countQuery = supabase
      .from("alunos")
      .select("id", { count: "exact", head: true });

    if (modalidade && modalidade !== "todas") {
      countQuery = countQuery.contains("modalidades", [modalidade]);
    }

    const { count } = await countQuery;

    // Buscar todos os alunos com perfil (sem paginação no DB, ordenar em memória)
    let query = supabase
      .from("alunos")
      .select("*, perfis!inner(nome, email, telefone, foto_url)");

    if (modalidade && modalidade !== "todas") {
      query = query.contains("modalidades", [modalidade]);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Ordenar alfabeticamente pelo nome do perfil
    const sorted = (data || []).sort((a: any, b: any) => {
      const nomeA = (a.perfis?.nome || "").toLowerCase();
      const nomeB = (b.perfis?.nome || "").toLowerCase();
      return nomeA.localeCompare(nomeB, "pt-BR");
    });

    // Paginar
    const paginados = sorted.slice(pagina * porPagina, (pagina + 1) * porPagina);

    return NextResponse.json({ alunos: paginados, total: sorted.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const { nome, email, senha, telefone, cpf, dataNascimento, contatoEmergencia, telefoneEmergencia, modalidades, planoId, observacoes, autoCadastro } = body;

    const emailFinal = email || `${(cpf || "").replace(/\D/g, "") || Date.now()}@goldlion.app`;

    // Criar usuario via admin API (sem trigger)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: emailFinal,
      password: senha || "123456",
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // Criar perfil manualmente (trigger removido)
    const { error: perfilError } = await supabase.from("perfis").insert({
      id: userId,
      nome: nome,
      email: emailFinal,
      telefone: telefone || null,
      perfil: "aluno",
    });

    if (perfilError) {
      // Rollback: deletar usuario auth se perfil falhar
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Erro ao criar perfil: " + perfilError.message }, { status: 400 });
    }

    // Criar registro aluno
    const dataInicio = new Date().toISOString().split("T")[0];
    const dataFim = new Date();
    dataFim.setMonth(dataFim.getMonth() + 1);

    const { error: alunoError } = await supabase.from("alunos").insert({
      id: userId,
      cpf: cpf || null,
      data_nascimento: dataNascimento || null,
      contato_emergencia: contatoEmergencia || null,
      telefone_emergencia: telefoneEmergencia || null,
      modalidades: modalidades || [],
      plano_id: planoId || null,
      status: autoCadastro ? "pendente" : "ativo",
      data_inicio_plano: dataInicio,
      data_fim_plano: dataFim.toISOString().split("T")[0],
      observacoes: observacoes || null,
    });

    if (alunoError) {
      return NextResponse.json({ error: "Erro ao criar aluno: " + alunoError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: userId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
