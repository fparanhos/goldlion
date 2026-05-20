import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Confirma que o chamador eh professor (ou admin) e esta ativo
  const { data: perfilChamador } = await supabase
    .from("perfis")
    .select("perfil, status")
    .eq("id", user.id)
    .single();

  if (!perfilChamador) {
    return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 404 });
  }

  if (perfilChamador.perfil !== "professor" && perfilChamador.perfil !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  if (perfilChamador.status === "pendente" || perfilChamador.status === "inativo") {
    return NextResponse.json({ error: "Sua conta nao esta ativa" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const { alunoId, modalidade } = body || {};
  if (!alunoId || !modalidade) {
    return NextResponse.json(
      { error: "alunoId e modalidade sao obrigatorios" },
      { status: 400 }
    );
  }

  // Confirma que o aluno existe (e ta ativo)
  const { data: aluno } = await supabase
    .from("alunos")
    .select("id, modalidades, status")
    .eq("id", alunoId)
    .single();

  if (!aluno) {
    return NextResponse.json({ error: "Aluno nao encontrado" }, { status: 404 });
  }

  const lat = Number(process.env.NEXT_PUBLIC_ACADEMIA_LAT) || 0;
  const lng = Number(process.env.NEXT_PUBLIC_ACADEMIA_LNG) || 0;

  const { data: checkin, error } = await supabase
    .from("checkins")
    .insert({
      aluno_id: alunoId,
      modalidade,
      latitude: lat,
      longitude: lng,
      validado: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, checkin });
}
