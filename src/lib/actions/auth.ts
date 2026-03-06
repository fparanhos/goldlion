"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const supabase = await createServerSupabase();
  const email = formData.get("email") as string;
  const senha = formData.get("senha") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/");
}

export async function registrarUsuario(dados: {
  email: string;
  senha: string;
  nome: string;
  perfil: "admin" | "professor" | "aluno";
}) {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase.auth.signUp({
    email: dados.email,
    password: dados.senha,
    options: {
      data: {
        nome: dados.nome,
        perfil: dados.perfil,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { data };
}
