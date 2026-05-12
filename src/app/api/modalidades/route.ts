import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function gerarSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 32);
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const ativasOnly = ["1", "true"].includes(searchParams.get("ativas") ?? "");

  let q = supabase.from("modalidades").select("*").order("ordem").order("nome");
  if (ativasOnly) q = q.eq("ativo", true);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const body = await request.json();
  const { nome, cor, ordem } = body;

  if (!nome || typeof nome !== "string" || nome.trim().length < 2) {
    return NextResponse.json({ error: "Nome invalido" }, { status: 400 });
  }
  if (!cor || typeof cor !== "string") {
    return NextResponse.json({ error: "Cor obrigatoria" }, { status: 400 });
  }

  const slug = gerarSlug(nome);
  if (!slug) {
    return NextResponse.json({ error: "Slug gerado vazio (use letras/numeros)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("modalidades")
    .insert({ slug, nome: nome.trim(), cor, ordem: Number(ordem) || 0, ativo: true })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ja existe modalidade com este nome ou slug" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const supabase = getSupabase();
  const body = await request.json();
  const { slug, ...updates } = body;

  if (!slug) return NextResponse.json({ error: "slug obrigatorio" }, { status: 400 });

  // slug e imutavel
  delete (updates as Record<string, unknown>).slug;
  if (updates.ordem !== undefined) updates.ordem = Number(updates.ordem) || 0;

  const { data, error } = await supabase
    .from("modalidades")
    .update(updates)
    .eq("slug", slug)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
