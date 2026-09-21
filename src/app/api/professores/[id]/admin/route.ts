import { NextRequest, NextResponse } from "next/server";
import { exigirPerfil, getSupabaseAdmin } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

// Promove um professor a administrador. So um admin logado pode chamar.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await exigirPerfil(["admin"]);
  if (auth.erro) return auth.erro;
  const supabase = getSupabaseAdmin();

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
