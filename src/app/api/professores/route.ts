import { NextRequest, NextResponse } from "next/server";
import { exigirPerfil, getSupabaseAdmin } from "@/lib/auth/api";

export async function GET() {
  const auth = await exigirPerfil(["admin"]);
  if (auth.erro) return auth.erro;
  const supabase = getSupabaseAdmin();

  // Professores + admins que tambem dao aula (perfis.leciona)
  const { data: perfis, error } = await supabase
    .from("perfis")
    .select("*")
    .in("perfil", ["professor", "admin"])
    .order("nome");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const data = perfis.filter((p: any) => p.perfil === "professor" || p.leciona === true);

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
  const auth = await exigirPerfil(["admin"]);
  if (auth.erro) return auth.erro;
  const supabase = getSupabaseAdmin();

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

    // upsert: o trigger handle_new_user (auth.users) ja cria o perfil basico
    const { error: perfilError } = await supabase.from("perfis").upsert({
      id: userId,
      nome,
      email,
      telefone: telefone || null,
      perfil: "professor",
    }, { onConflict: "id" });

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
  const auth = await exigirPerfil(["admin"]);
  if (auth.erro) return auth.erro;
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { id, nome, telefone, status, leciona, resetSenha, novaSenha } = body;

    if (!id) return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

    // Resetar senha: vira temporaria e o usuario troca no proximo login
    if (resetSenha) {
      if (typeof novaSenha !== "string" || novaSenha.length < 6) {
        return NextResponse.json({ error: "A senha deve ter no minimo 6 caracteres" }, { status: 400 });
      }
      const { data: alvo } = await supabase.from("perfis").select("perfil").eq("id", id).single();
      if (alvo?.perfil !== "professor" && alvo?.perfil !== "admin") {
        return NextResponse.json({ error: "Usuario nao e professor" }, { status: 400 });
      }
      const { error } = await supabase.auth.admin.updateUserById(id, {
        password: novaSenha,
        user_metadata: { senha_temporaria: true },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const updates: any = {};
    if (nome) updates.nome = nome;
    if (telefone !== undefined) updates.telefone = telefone;
    if (status && ["pendente", "ativo", "inativo"].includes(status)) {
      updates.status = status;
    }
    if (typeof leciona === "boolean") updates.leciona = leciona;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("perfis").update(updates).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await exigirPerfil(["admin"]);
  if (auth.erro) return auth.erro;
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const force = searchParams.get("force") === "1";

  if (!id) return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

  try {
    // Admins aparecem na lista quando lecionam, mas nao sao excluidos por aqui
    const { data: alvo } = await supabase.from("perfis").select("perfil").eq("id", id).single();
    if (alvo?.perfil === "admin") {
      return NextResponse.json(
        { error: "Este usuario e administrador. Use 'Parar de lecionar' para tira-lo da lista." },
        { status: 400 }
      );
    }

    // Verificar aulas vinculadas
    const { data: aulas, error: aulasErr } = await supabase
      .from("aulas")
      .select("id, modalidade, dia_semana, hora_inicio, hora_fim")
      .eq("professor_id", id);

    if (aulasErr) {
      return NextResponse.json({ error: aulasErr.message }, { status: 400 });
    }

    if (aulas && aulas.length > 0 && !force) {
      return NextResponse.json(
        {
          error: "Professor tem aulas vinculadas",
          aulas,
          requireForce: true,
        },
        { status: 409 }
      );
    }

    // Force: apagar aulas primeiro (FK aulas.professor_id -> perfis)
    if (aulas && aulas.length > 0) {
      const { error: delAulasErr } = await supabase.from("aulas").delete().eq("professor_id", id);
      if (delAulasErr) {
        return NextResponse.json({ error: "Erro ao remover aulas: " + delAulasErr.message }, { status: 400 });
      }
    }

    // Apagar usuario do auth (perfis cascateia via ON DELETE CASCADE)
    const { error: authErr } = await supabase.auth.admin.deleteUser(id);
    if (authErr) {
      return NextResponse.json({ error: "Erro ao remover usuario: " + authErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, aulasRemovidas: aulas?.length || 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
