import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Promove um professor a administrador. So um admin logado pode chamar.
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

  const { data: chamador } = await supabase
    .from("perfis")
    .select("perfil, status")
    .eq("id", user.id)
    .single();

  if (chamador?.perfil !== "admin" || chamador?.status !== "ativo") {
    return NextResponse.json({ error: "Apenas administradores podem fazer isso" }, { status: 403 });
  }

  const { data: alvo } = await supabase
    .from("perfis")
    .select("perfil, status")
    .eq("id", id)
    .single();

  if (!alvo) {
    return NextResponse.json({ error: "Professor nao encontrado" }, { status: 404 });
  }
  if (alvo.perfil !== "professor") {
    return NextResponse.json({ error: "Usuario nao e professor" }, { status: 400 });
  }
  if (alvo.status !== "ativo") {
    return NextResponse.json({ error: "Aprove o professor antes de torna-lo administrador" }, { status: 400 });
  }

  const { error } = await supabase
    .from("perfis")
    .update({ perfil: "admin", atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("perfil", "professor");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
