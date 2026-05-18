"use client";

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PwaUpdater from "@/components/PwaUpdater";
import { ModalidadesProvider } from "@/lib/modalidades/ModalidadesProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModalidadesProvider>
      <div className="min-h-screen bg-dark max-w-lg mx-auto relative">
        <Header />
        <main className="pb-20 px-4 py-4">{children}</main>
        <BottomNav />
        <PwaUpdater />
      </div>
    </ModalidadesProvider>
  );
}
