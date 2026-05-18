"use client";

import { useEffect, useState } from "react";

export default function PwaUpdater() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [novaVersao, setNovaVersao] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;

        // SW ja com nova versao esperando (caso de abrir o app depois de um deploy)
        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(reg.waiting);
          setNovaVersao(true);
        }

        // Detecta novo SW chegando enquanto o app esta aberto
        reg.addEventListener("updatefound", () => {
          const novo = reg.installing;
          if (!novo) return;
          novo.addEventListener("statechange", () => {
            if (novo.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(novo);
              setNovaVersao(true);
            }
          });
        });
      })
      .catch(console.error);

    // Recarrega quando o SW novo assume controle (apos SKIP_WAITING)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    // Checagem periodica de update enquanto a aba esta aberta (a cada 30 min)
    const interval = setInterval(() => {
      registration?.update().catch(() => null);
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  function atualizar() {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  if (!novaVersao) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md">
      <div className="bg-gold text-black rounded-xl shadow-2xl border-2 border-gold-dark px-4 py-3 flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-6 h-6 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">Nova versao disponivel</p>
          <p className="text-xs leading-tight text-black/70">Toque em Atualizar para carregar agora.</p>
        </div>
        <button
          onClick={atualizar}
          className="bg-black text-gold px-3 py-1.5 rounded-lg font-bold text-sm active:bg-dark-light"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}
