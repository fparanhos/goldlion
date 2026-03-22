import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const cookieStore = await cookies();
  const authServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* read-only */ },
      },
    }
  );

  const { data: { user } } = await authServer.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  try {
    const hoje = new Date().getDay();

    const [perfilRes, alunoRes] = await Promise.all([
      supabase.from("perfis").select("*").eq("id", user.id).single(),
      supabase.from("alunos").select("*, planos(nome, tipo, valor)").eq("id", user.id).single(),
    ]);

    if (!alunoRes.data) {
      return NextResponse.json({ error: "Dados do aluno nao encontrados" }, { status: 404 });
    }

    const aluno = alunoRes.data;

    const [aulasRes, checkinsRes, pagsRes] = await Promise.all([
      supabase
        .from("aulas")
        .select("*")
        .eq("dia_semana", hoje)
        .eq("ativo", true)
        .in("modalidade", aluno.modalidades || []),
      supabase
        .from("checkins")
        .select("*")
        .eq("aluno_id", user.id)
        .order("data_hora_entrada", { ascending: false })
        .limit(3),
      supabase
        .from("pagamentos")
        .select("*")
        .eq("aluno_id", user.id)
        .in("status", ["pendente", "atrasado"])
        .order("data_vencimento")
        .limit(1),
    ]);

    return NextResponse.json({
      perfil: perfilRes.data,
      aluno,
      aulas: aulasRes.data || [],
      checkins: checkinsRes.data || [],
      pagPendente: pagsRes.data?.[0] || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
