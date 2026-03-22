import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("planos")
    .select("*")
    .order("valor");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
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
  const supabase = getSupabase();
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
