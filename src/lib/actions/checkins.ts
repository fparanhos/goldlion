"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ACADEMIA_LAT = Number(process.env.NEXT_PUBLIC_ACADEMIA_LAT) || -23.5505;
const ACADEMIA_LNG = Number(process.env.NEXT_PUBLIC_ACADEMIA_LNG) || -46.6333;
const RAIO_METROS = Number(process.env.NEXT_PUBLIC_ACADEMIA_RAIO) || 200;

function calcularDistancia(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // raio da Terra em metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function fazerCheckin(dados: {
  modalidade: "muaythai" | "boxe" | "jiujitsu";
  latitude: number;
  longitude: number;
}) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario nao autenticado" };
  }

  // Validar distancia
  const distancia = calcularDistancia(
    dados.latitude,
    dados.longitude,
    ACADEMIA_LAT,
    ACADEMIA_LNG
  );

  const validado = distancia <= RAIO_METROS;

  // Verificar se ja fez checkin hoje para esta modalidade
  const hoje = new Date().toISOString().split("T")[0];
  const { data: checkinExistente } = await supabase
    .from("checkins")
    .select("id")
    .eq("aluno_id", user.id)
    .eq("modalidade", dados.modalidade)
    .gte("data_hora_entrada", `${hoje}T00:00:00`)
    .lte("data_hora_entrada", `${hoje}T23:59:59`)
    .maybeSingle();

  if (checkinExistente) {
    return { error: "Voce ja fez check-in para esta modalidade hoje" };
  }

  const { data, error } = await supabase
    .from("checkins")
    .insert({
      aluno_id: user.id,
      modalidade: dados.modalidade,
      latitude: dados.latitude,
      longitude: dados.longitude,
      validado,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/checkin");
  revalidatePath("/dashboard");

  if (!validado) {
    return {
      data,
      warning: `Check-in registrado, mas voce esta a ${Math.round(distancia)}m da academia (maximo: ${RAIO_METROS}m). Aguardando validacao.`,
    };
  }

  return { data };
}

export async function fazerCheckout(checkinId: string) {
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("checkins")
    .update({ data_hora_saida: new Date().toISOString() })
    .eq("id", checkinId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/checkin");
  return { success: true };
}

export async function listarCheckins(filtros?: {
  alunoId?: string;
  data?: string;
  limit?: number;
}) {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("checkins")
    .select("*, alunos!inner(id, perfis!inner(nome))")
    .order("data_hora_entrada", { ascending: false });

  if (filtros?.alunoId) {
    query = query.eq("aluno_id", filtros.alunoId);
  }

  if (filtros?.data) {
    query = query
      .gte("data_hora_entrada", `${filtros.data}T00:00:00`)
      .lte("data_hora_entrada", `${filtros.data}T23:59:59`);
  }

  if (filtros?.limit) {
    query = query.limit(filtros.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao listar checkins:", error);
    return [];
  }

  return data;
}
