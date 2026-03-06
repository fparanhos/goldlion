"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function listarMensagens(canal: string, limit = 50) {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("mensagens")
    .select("*, perfis!inner(nome, perfil)")
    .eq("canal", canal)
    .order("criado_em", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Erro ao listar mensagens:", error);
    return [];
  }

  return data;
}

export async function enviarMensagem(dados: {
  conteudo: string;
  canal: string;
}) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario nao autenticado" };
  }

  const { data, error } = await supabase
    .from("mensagens")
    .insert({
      remetente_id: user.id,
      conteudo: dados.conteudo,
      canal: dados.canal,
    })
    .select("*, perfis!inner(nome, perfil)")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/comunicacao");
  return { data };
}
