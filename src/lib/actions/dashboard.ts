"use server";

import { createServerSupabase } from "@/lib/supabase/server";

export async function getDashboardData() {
  const supabase = await createServerSupabase();
  const hoje = new Date().toISOString().split("T")[0];
  const diaSemana = new Date().getDay();

  // Todas as queries em paralelo
  const [
    alunosAtivos,
    inadimplentes,
    checkinsHoje,
    pagamentosMes,
    pagamentosAtrasados,
    aulasHoje,
    ultimosCheckins,
  ] = await Promise.all([
    supabase
      .from("alunos")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo"),

    supabase
      .from("alunos")
      .select("id", { count: "exact", head: true })
      .eq("status", "inadimplente"),

    supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .gte("data_hora_entrada", `${hoje}T00:00:00`)
      .lte("data_hora_entrada", `${hoje}T23:59:59`),

    supabase
      .from("pagamentos")
      .select("valor, status")
      .eq("status", "pago")
      .gte("data_pagamento", `${hoje.slice(0, 7)}-01`)
      .lte("data_pagamento", `${hoje.slice(0, 7)}-31`),

    supabase
      .from("pagamentos")
      .select("id", { count: "exact", head: true })
      .eq("status", "atrasado"),

    supabase
      .from("aulas")
      .select("*, perfis!professor_id(nome)")
      .eq("dia_semana", diaSemana)
      .eq("ativo", true)
      .order("hora_inicio"),

    supabase
      .from("checkins")
      .select("*, alunos!inner(id, perfis!inner(nome))")
      .gte("data_hora_entrada", `${hoje}T00:00:00`)
      .order("data_hora_entrada", { ascending: false })
      .limit(5),
  ]);

  const receitaMes =
    pagamentosMes.data?.reduce((acc, p) => acc + Number(p.valor), 0) || 0;

  return {
    totalAlunos: alunosAtivos.count || 0,
    inadimplentes: inadimplentes.count || 0,
    checkinsHoje: checkinsHoje.count || 0,
    receitaMes,
    pagamentosAtrasados: pagamentosAtrasados.count || 0,
    aulasHoje: aulasHoje.data || [],
    ultimosCheckins: ultimosCheckins.data || [],
  };
}

export async function getPerfilUsuario() {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfis")
    .select("*")
    .eq("id", user.id)
    .single();

  return perfil;
}
