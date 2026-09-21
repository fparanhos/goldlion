import { NextRequest, NextResponse } from "next/server";
import { exigirPerfil, getSupabaseAdmin } from "@/lib/auth/api";

export async function GET() {
  // Leitura publica: usada pela tela /cadastro
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("planos")
    .select("*")
    .order("valor");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await exigirPerfil(["admin"]);
  if (auth.erro) return auth.erro;
  const supabase = getSupabaseAdmin();
  const body = await request.json();

  const { nome, tipo, modalidades, valor } = body;

  if (!nome || !tipo || !modalidades?.length || !valor) {
    return NextResponse.json({ error: "Preencha todos os campos" }, { status: 400 });
  }

  const { data, error } = await supabase.from("planos").insert({
    nome,
    tipo,
    modalidades,
    valor: Number(valor),
    ativo: true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const auth = await exigirPerfil(["admin"]);
  if (auth.erro) return auth.erro;
  const supabase = getSupabaseAdmin();
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

  if (updates.valor) updates.valor = Number(updates.valor);

  const { data, error } = await supabase
    .from("planos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
