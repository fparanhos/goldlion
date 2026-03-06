"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Perfil {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  perfil: "admin" | "professor" | "aluno";
  foto_url: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("perfis")
          .select("*")
          .eq("id", user.id)
          .single();
        setPerfil(data as Perfil);
      }

      setLoading(false);
    }

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase
          .from("perfis")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setPerfil(data as Perfil);
      } else {
        setPerfil(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, perfil, loading, supabase };
}
