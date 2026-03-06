"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// Hook generico para buscar dados do Supabase com fallback para mock
export function useSupabaseQuery<T>(
  queryFn: (supabase: ReturnType<typeof createClient>) => Promise<{ data: T | null; error: any }>,
  fallbackData: T,
  deps: any[] = []
) {
  const [data, setData] = useState<T>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await queryFn(supabase);
      if (result.error) {
        console.warn("Supabase query error, using fallback:", result.error.message);
        setData(fallbackData);
        setError(result.error.message);
      } else {
        setData(result.data as T);
        setError(null);
      }
    } catch (err) {
      console.warn("Supabase connection error, using fallback data");
      setData(fallbackData);
      setError("Usando dados offline");
    }
    setLoading(false);
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

// Hook para realtime subscriptions (mensagens)
export function useRealtimeMessages(canal: string) {
  const [mensagens, setMensagens] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Buscar mensagens existentes
    supabase
      .from("mensagens")
      .select("*, perfis!inner(nome, perfil)")
      .eq("canal", canal)
      .order("criado_em", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setMensagens(data);
      });

    // Ouvir novas mensagens em tempo real
    const channel = supabase
      .channel(`mensagens-${canal}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens",
          filter: `canal=eq.${canal}`,
        },
        async (payload) => {
          // Buscar dados do remetente
          const { data: msg } = await supabase
            .from("mensagens")
            .select("*, perfis!inner(nome, perfil)")
            .eq("id", payload.new.id)
            .single();

          if (msg) {
            setMensagens((prev) => [msg, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canal]);

  return mensagens;
}
