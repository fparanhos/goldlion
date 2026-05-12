"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface Modalidade {
  slug: string;
  nome: string;
  cor: string;
  ativo: boolean;
  ordem: number;
}

interface ModalidadesCtxValue {
  modalidades: Modalidade[];
  modalidadesAtivas: Modalidade[];
  byMap: Record<string, Modalidade>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ModalidadesCtx = createContext<ModalidadesCtxValue | null>(null);

export function ModalidadesProvider({ children }: { children: React.ReactNode }) {
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/modalidades");
      const data = await res.json();
      if (Array.isArray(data)) setModalidades(data);
    } catch {
      /* mantem estado anterior em caso de falha de rede */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const modalidadesAtivas = modalidades.filter((m) => m.ativo);
  const byMap = Object.fromEntries(modalidades.map((m) => [m.slug, m]));

  return (
    <ModalidadesCtx.Provider
      value={{ modalidades, modalidadesAtivas, byMap, loading, refresh }}
    >
      {children}
    </ModalidadesCtx.Provider>
  );
}

export function useModalidades(): ModalidadesCtxValue {
  const ctx = useContext(ModalidadesCtx);
  if (!ctx) throw new Error("useModalidades deve ser usado dentro de <ModalidadesProvider>");
  return ctx;
}

export function nomeDeModalidade(byMap: Record<string, Modalidade>, slug: string): string {
  return byMap[slug]?.nome ?? slug;
}

export function corDeModalidade(byMap: Record<string, Modalidade>, slug: string): string {
  return byMap[slug]?.cor ?? "bg-gray-600";
}
