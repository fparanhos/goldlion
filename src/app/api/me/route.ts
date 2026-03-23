import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Usar service role para buscar perfil
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Pegar o user id do token de auth
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
    return NextResponse.json({ perfil: null });
  }

  const { data } = await supabase
    .from("perfis")
    .select("perfil, nome")
    .eq("id", user.id)
    .single();

  const senhaTemporaria = user.user_metadata?.senha_temporaria === true;

  // Se for aluno, buscar status para verificar se esta pendente
  let statusAluno = null;
  if (data?.perfil === "aluno") {
    const { data: alunoData } = await supabase
      .from("alunos")
      .select("status")
      .eq("id", user.id)
      .single();
    statusAluno = alunoData?.status || null;
  }

  return NextResponse.json({
    perfil: data?.perfil || null,
    nome: data?.nome || null,
    senhaTemporaria,
    statusAluno,
  });
}
