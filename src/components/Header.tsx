"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const titles: Record<string, string> = {
  "/dashboard": "Gold Lion Academy",
  "/alunos": "Alunos",
  "/alunos/novo": "Novo Aluno",
  "/financeiro": "Financeiro",
  "/checkin": "Check-in",
  "/comunicacao": "Comunicacao",
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const title = titles[pathname] || "Gold Lion";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 bg-dark-light border-b border-gray-800">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-gold.jpeg" alt="Gold Lion" width={32} height={32} className="rounded-full" />
          <h1 className="text-lg font-bold text-gold">{title}</h1>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="w-8 h-8 rounded-full overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-gold.jpeg" alt="Menu" width={32} height={32} />
          </button>
          {menuAberto && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuAberto(false)}
              />
              <div className="absolute right-0 top-10 bg-dark-light border border-gray-700 rounded-lg shadow-xl z-50 w-44 py-1">
                <button
                  onClick={() => {
                    setMenuAberto(false);
                    router.push("/dashboard");
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-lighter"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    setMenuAberto(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-dark-lighter"
                >
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
