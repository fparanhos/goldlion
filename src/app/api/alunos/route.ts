import { NextRequest, NextResponse } from "next/server";
import { exigirPerfil, getChamador, getSupabaseAdmin } from "@/lib/auth/api";
import { gerarPrimeiraMensalidadeSeNecessario } from "@/lib/mensalidades";

export async function GET(request: NextRequest) {
  // Professor tambem lista alunos (tela de presenca)
  const auth = await exigirPerfil(["admin", "professor"]);
  if (auth.erro) return auth.erro;
  const supabase = getSupabaseAdmin();
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
  // Rota publica (tela /cadastro) e tambem usada pelo admin (alunos/novo).
  // Quem nao e admin cai sempre nas regras de auto-cadastro.
  const chamador = await getChamador();
  const ehAdmin = chamador?.perfil === "admin";
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const {
      nome,
      email,
      senha,
      telefone,
      cpf,
      dataNascimento,
      contatoEmergencia,
      telefoneEmergencia,
      modalidades,
      planoId,
    } = body;
    const observacoes = ehAdmin ? body.observacoes : null;
    const autoCadastro = ehAdmin ? body.autoCadastro : true;
    const tipoCadastro = body.tipoCadastro;

    if (!ehAdmin) {
      if (!nome || !email) {
        return NextResponse.json({ error: "Nome e email sao obrigatorios" }, { status: 400 });
      }
      if (typeof senha !== "string" || senha.length < 6) {
        return NextResponse.json({ error: "A senha deve ter no minimo 6 caracteres" }, { status: 400 });
      }
    }

    const ehProfessor = tipoCadastro === "professor";
    const perfilTipo: "aluno" | "professor" = ehProfessor ? "professor" : "aluno";

    const emailFinal = email || `${(cpf || "").replace(/\D/g, "") || Date.now()}@goldlion.app`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: emailFinal,
      password: senha || "123456",
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // Auto-cadastro: aluno entra ativo direto, professor segue precisando de aprovação
    const statusPerfil = autoCadastro && ehProfessor ? "pendente" : "ativo";

    // upsert: o trigger handle_new_user (auth.users) ja cria o perfil basico
    const { error: perfilError } = await supabase.from("perfis").upsert({
      id: userId,
      nome: nome,
      email: emailFinal,
      telefone: telefone || null,
      perfil: perfilTipo,
      status: statusPerfil,
    }, { onConflict: "id" });

    if (perfilError) {
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Erro ao criar perfil: " + perfilError.message }, { status: 400 });
    }

    // Professor nao tem registro em `alunos`
    if (ehProfessor) {
      return NextResponse.json({ success: true, id: userId, tipoCadastro: "professor" });
    }

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
      status: "ativo",
      data_inicio_plano: dataInicio,
      data_fim_plano: dataFim.toISOString().split("T")[0],
      observacoes: observacoes || null,
    });

    if (alunoError) {
      return NextResponse.json({ error: "Erro ao criar aluno: " + alunoError.message }, { status: 400 });
    }

    // Aluno entra ativo direto (admin ou auto-cadastro). Com plano, gera primeira mensalidade.
    if (planoId) {
      const r = await gerarPrimeiraMensalidadeSeNecessario(supabase, userId);
      if (r.erro) {
        console.error("[alunos POST] falha ao gerar primeira mensalidade:", r.erro);
      }
    }

    return NextResponse.json({ success: true, id: userId, tipoCadastro: "aluno" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
