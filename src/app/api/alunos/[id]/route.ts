import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  try {
    const [alunoRes, pagsRes, ciRes] = await Promise.all([
      supabase
        .from("alunos")
        .select("*, perfis!inner(nome, email, telefone, foto_url, criado_em), planos(nome, tipo, valor)")
        .eq("id", id)
        .single(),
      supabase
        .from("pagamentos")
        .select("*")
        .eq("aluno_id", id)
        .order("data_vencimento", { ascending: false }),
      supabase
        .from("checkins")
        .select("*")
        .eq("aluno_id", id)
        .order("data_hora_entrada", { ascending: false })
        .limit(10),
    ]);

    if (alunoRes.error) {
      return NextResponse.json({ error: "Aluno nao encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      aluno: alunoRes.data,
      pagamentos: pagsRes.data || [],
      checkins: ciRes.data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const {
      status, resetSenha, novaSenha,
      nome, telefone,
      cpf, dataNascimento, contatoEmergencia, telefoneEmergencia,
      modalidades, planoId, faixa, observacoes,
      dataInicioPlano, dataFimPlano,
    } = body;

    // Atualizar status do aluno
    if (status) {
      const { error } = await supabase.from("alunos").update({ status }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Resetar senha
    if (resetSenha) {
      const senha = novaSenha || "123456";
      const { error } = await supabase.auth.admin.updateUserById(id, {
        password: senha,
        user_metadata: { senha_temporaria: true },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Atualizar perfil (nome, telefone)
    if (nome || telefone) {
      const perfilUpdate: any = {};
      if (nome) perfilUpdate.nome = nome;
      if (telefone) perfilUpdate.telefone = telefone;
      const { error } = await supabase.from("perfis").update(perfilUpdate).eq("id", id);
      if (error) return NextResponse.json({ error: "Erro ao atualizar perfil: " + error.message }, { status: 400 });
    }

    // Atualizar dados do aluno
    const alunoUpdate: any = {};
    if (cpf !== undefined) alunoUpdate.cpf = cpf || null;
    if (dataNascimento !== undefined) alunoUpdate.data_nascimento = dataNascimento || null;
    if (contatoEmergencia !== undefined) alunoUpdate.contato_emergencia = contatoEmergencia || null;
    if (telefoneEmergencia !== undefined) alunoUpdate.telefone_emergencia = telefoneEmergencia || null;
    if (modalidades !== undefined) alunoUpdate.modalidades = modalidades;
    if (planoId !== undefined) alunoUpdate.plano_id = planoId || null;
    if (faixa !== undefined) alunoUpdate.faixa = faixa || null;
    if (observacoes !== undefined) alunoUpdate.observacoes = observacoes || null;
    if (dataInicioPlano !== undefined) alunoUpdate.data_inicio_plano = dataInicioPlano || null;
    if (dataFimPlano !== undefined) alunoUpdate.data_fim_plano = dataFimPlano || null;

    if (Object.keys(alunoUpdate).length > 0) {
      const { error } = await supabase.from("alunos").update(alunoUpdate).eq("id", id);
      if (error) return NextResponse.json({ error: "Erro ao atualizar aluno: " + error.message }, { status: 400 });
    }

    // Se plano foi atribuido, criar pagamento pendente automaticamente (se nao existir um pendente)
    if (planoId) {
      const { data: plano } = await supabase.from("planos").select("valor, nome").eq("id", planoId).single();
      if (plano) {
        const agora = new Date();
        const mesRef = `${String(agora.getMonth() + 1).padStart(2, "0")}/${agora.getFullYear()}`;

        // Verificar se ja existe pagamento pendente para esta referencia
        const { data: pagExistente } = await supabase
          .from("pagamentos")
          .select("id")
          .eq("aluno_id", id)
          .eq("referencia", mesRef)
          .in("status", ["pendente", "atrasado", "pago"])
          .limit(1);

        if (!pagExistente || pagExistente.length === 0) {
          // Vencimento = dia 10 do mes atual ou proximo mes se ja passou
          const vencimento = new Date(agora.getFullYear(), agora.getMonth(), 10);
          if (vencimento < agora) {
            vencimento.setMonth(vencimento.getMonth() + 1);
          }

          await supabase.from("pagamentos").insert({
            aluno_id: id,
            valor: plano.valor,
            data_vencimento: vencimento.toISOString().split("T")[0],
            referencia: mesRef,
            status: "pendente",
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
