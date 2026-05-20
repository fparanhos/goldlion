import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// Rotas exclusivas do admin
const ROTAS_ADMIN = [
  "/dashboard",
  "/alunos",
  "/aulas",
  "/checkin",
  "/comunicacao",
  "/financeiro",
  "/modalidades",
  "/planos",
  "/professores",
];

function ehRotaAdmin(path: string) {
  return ROTAS_ADMIN.some((r) => path === r || path.startsWith(r + "/"));
}

function destinoPorPerfil(perfil: string | null) {
  if (perfil === "professor") return "/professor";
  if (perfil === "aluno") return "/aluno";
  return "/dashboard";
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  if (/\.(svg|png|jpe?g|webp|gif|ico|webmanifest|json|txt)$/i.test(path)) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!supabaseUrl || supabaseUrl.includes("SEU-PROJETO")) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nao autenticado: deixa passar so rotas publicas
  if (!user) {
    if (
      !path.startsWith("/login") &&
      !path.startsWith("/auth") &&
      !path.startsWith("/api/") &&
      !path.startsWith("/cadastro") &&
      !path.startsWith("/recuperar-senha") &&
      !path.startsWith("/redefinir-senha") &&
      !path.startsWith("/trocar-senha") &&
      path !== "/"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Autenticado: bloquear acesso a rotas que nao sao do perfil dele.
  // Pular API e rotas neutras (trocar-senha, callbacks, root, etc).
  if (
    path.startsWith("/api/") ||
    path === "/" ||
    path.startsWith("/trocar-senha") ||
    path.startsWith("/redefinir-senha") ||
    path.startsWith("/recuperar-senha") ||
    path.startsWith("/auth")
  ) {
    return supabaseResponse;
  }

  // Buscar perfil via service role (RLS-bypass) so se a rota for sensivel
  const ehAdmin = ehRotaAdmin(path);
  const ehAreaProfessor = path === "/professor" || path.startsWith("/professor/");
  const ehAreaAluno = path === "/aluno" || path.startsWith("/aluno/");

  if (!ehAdmin && !ehAreaProfessor && !ehAreaAluno) {
    return supabaseResponse;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    // Sem service role nao da pra checar perfil sem RLS; deixa passar
    return supabaseResponse;
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: perfilRow } = await admin
    .from("perfis")
    .select("perfil")
    .eq("id", user.id)
    .single();

  const perfil = (perfilRow?.perfil as string | null) ?? null;

  // Rotas admin: so admin entra
  if (ehAdmin && perfil !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = destinoPorPerfil(perfil);
    return NextResponse.redirect(url);
  }

  // Area do professor: so professor (admin pode passar tb pra suporte)
  if (ehAreaProfessor && perfil !== "professor" && perfil !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = destinoPorPerfil(perfil);
    return NextResponse.redirect(url);
  }

  // Area do aluno: so aluno (admin pode passar tb pra suporte)
  if (ehAreaAluno && perfil !== "aluno" && perfil !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = destinoPorPerfil(perfil);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
