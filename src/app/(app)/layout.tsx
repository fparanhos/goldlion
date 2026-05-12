"use client";

import { useEffect } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { ModalidadesProvider } from "@/lib/modalidades/ModalidadesProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Registrar Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  return (
    <ModalidadesProvider>
      <div className="min-h-screen bg-dark max-w-lg mx-auto relative">
        <Header />
        <main className="pb-20 px-4 py-4">{children}</main>
        <BottomNav />
      </div>
    </ModalidadesProvider>
  );
}
