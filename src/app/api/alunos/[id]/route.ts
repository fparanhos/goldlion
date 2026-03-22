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
    const { status, resetSenha, novaSenha } = body;

    if (status) {
      const { error } = await supabase.from("alunos").update({ status }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (resetSenha) {
      const senha = novaSenha || "123456";
      const { error } = await supabase.auth.admin.updateUserById(id, {
        password: senha,
        user_metadata: { senha_temporaria: true },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
