import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export type PerfilUsuario = "admin" | "professor" | "aluno";

export type Chamador = { id: string; perfil: PerfilUsuario };

// Client com service role (bypassa RLS). Usar so depois de checar o chamador.
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Usuario logado (via cookie de sessao) com perfil ativo, ou null.
export async function getChamador(): Promise<Chamador | null> {
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
  if (!user) return null;

  const { data: perfil } = await getSupabaseAdmin()
    .from("perfis")
    .select("perfil, status")
    .eq("id", user.id)
    .single();

  if (!perfil || perfil.status !== "ativo") return null;
  return { id: user.id, perfil: perfil.perfil as PerfilUsuario };
}

// Retorna o chamador se ele tiver um dos perfis permitidos; senao, a resposta 401/403 pronta.
export async function exigirPerfil(
  permitidos: PerfilUsuario[]
): Promise<{ chamador: Chamador; erro?: never } | { chamador?: never; erro: NextResponse }> {
  const chamador = await getChamador();
  if (!chamador) {
    return { erro: NextResponse.json({ error: "Nao autenticado" }, { status: 401 }) };
  }
  if (!permitidos.includes(chamador.perfil)) {
    return { erro: NextResponse.json({ error: "Sem permissao" }, { status: 403 }) };
  }
  return { chamador };
}
