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
    .from("aulas")
    .select("*, perfis!aulas_professor_id_fkey(nome)")
    .eq("ativo", true)
    .order("dia_semana")
    .order("hora_inicio");

  if (error) {
    // Fallback: buscar sem join se a FK não bater
    const { data: aulas, error: err2 } = await supabase
      .from("aulas")
      .select("*")
      .eq("ativo", true)
      .order("dia_semana")
      .order("hora_inicio");

    if (err2) return NextResponse.json({ error: err2.message }, { status: 400 });

    // Buscar nomes dos professores separadamente
    const profIds = [...new Set((aulas || []).map((a: any) => a.professor_id))];
    const subIds = [...new Set((aulas || []).filter((a: any) => a.substituto_id).map((a: any) => a.substituto_id))];
    const allIds = [...new Set([...profIds, ...subIds])];

    const { data: perfis } = await supabase
      .from("perfis")
      .select("id, nome")
      .in("id", allIds.length > 0 ? allIds : ["none"]);

    const nomeMap: Record<string, string> = {};
    (perfis || []).forEach((p: any) => { nomeMap[p.id] = p.nome; });

    const aulasComNome = (aulas || []).map((a: any) => ({
      ...a,
      professor_nome: nomeMap[a.professor_id] || "—",
      substituto_nome: a.substituto_id ? (nomeMap[a.substituto_id] || null) : null,
    }));

    return NextResponse.json(aulasComNome);
  }

  // Buscar substitutos
  const subIds = [...new Set((data || []).filter((a: any) => a.substituto_id).map((a: any) => a.substituto_id))];
  let subMap: Record<string, string> = {};
  if (subIds.length > 0) {
    const { data: subs } = await supabase.from("perfis").select("id, nome").in("id", subIds);
    (subs || []).forEach((s: any) => { subMap[s.id] = s.nome; });
  }

  const aulas = (data || []).map((a: any) => ({
    ...a,
    professor_nome: a.perfis?.nome || "—",
    substituto_nome: a.substituto_id ? (subMap[a.substituto_id] || null) : null,
  }));

  return NextResponse.json(aulas);
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const { modalidade, professor_id, dia_semana, hora_inicio, hora_fim, vagas, substituto_id } = body;

    if (!modalidade || !professor_id || dia_semana === undefined || !hora_inicio || !hora_fim) {
      return NextResponse.json({ error: "Preencha todos os campos obrigatorios" }, { status: 400 });
    }

    const insert: any = {
      modalidade,
      professor_id,
      dia_semana: Number(dia_semana),
      hora_inicio,
      hora_fim,
      vagas: vagas ? Number(vagas) : 20,
      ativo: true,
    };

    if (substituto_id) insert.substituto_id = substituto_id;

    const { data, error } = await supabase.from("aulas").insert(insert).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

    if (updates.dia_semana !== undefined) updates.dia_semana = Number(updates.dia_semana);
    if (updates.vagas !== undefined) updates.vagas = Number(updates.vagas);
    if (updates.substituto_id === "") updates.substituto_id = null;

    const { data, error } = await supabase.from("aulas").update(updates).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

    // Soft delete
    const { error } = await supabase.from("aulas").update({ ativo: false }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
