import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const patch: Record<string, unknown> = { validado: true };
  let { data: checkin, error } = await supabase
    .from("checkins")
    .update({ ...patch, validado_por: user.id, validado_em: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  // Retry sem colunas de rastreamento caso a migration add_validacao_checkin nao tenha sido aplicada
  if (error && /validado_por|validado_em/i.test(error.message)) {
    const retry = await supabase
      .from("checkins")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    checkin = retry.data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!checkin) {
    return NextResponse.json({ error: "Check-in nao encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true, checkin });
}
