import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("perfis")
    .select("*")
    .eq("perfil", "professor")
    .order("nome");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const profIds = data.map((p: any) => p.id);
  const { data: aulas } = await supabase
    .from("aulas")
    .select("*")
    .in("professor_id", profIds.length > 0 ? profIds : ["none"])
    .eq("ativo", true)
    .order("dia_semana")
    .order("hora_inicio");

  const professores = data.map((p: any) => ({
    ...p,
    aulas: (aulas || []).filter((a: any) => a.professor_id === p.id),
    modalidades: [...new Set((aulas || []).filter((a: any) => a.professor_id === p.id).map((a: any) => a.modalidade))],
  }));

  return NextResponse.json(professores);
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const { nome, email, senha, telefone, modalidades } = body;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: senha || "goldlion123",
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    const { error: perfilError } = await supabase.from("perfis").insert({
      id: userId,
      nome,
      email,
      telefone: telefone || null,
      perfil: "professor",
    });

    if (perfilError) {
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Erro ao criar perfil: " + perfilError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: userId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const { id, nome, telefone, modalidades } = body;

    if (!id) return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

    const updates: any = {};
    if (nome) updates.nome = nome;
    if (telefone !== undefined) updates.telefone = telefone;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("perfis").update(updates).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
