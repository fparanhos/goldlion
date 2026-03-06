"use server";

import { createServerSupabase } from "@/lib/supabase/server";

export async function salvarPushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nao autenticado" };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function enviarNotificacaoParaTodos(dados: {
  titulo: string;
  corpo: string;
  url?: string;
}) {
  const supabase = await createServerSupabase();

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (!subscriptions || subscriptions.length === 0) {
    return { enviados: 0 };
  }

  let enviados = 0;

  for (const sub of subscriptions) {
    try {
      // Web Push API - em producao usar web-push library no servidor
      // Por enquanto logamos a intencao
      console.log(`Push para ${sub.endpoint}: ${dados.titulo}`);
      enviados++;
    } catch (err) {
      console.error("Erro ao enviar push:", err);
    }
  }

  return { enviados };
}
