"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        className:
          "!bg-zinc-950/90 !border !border-white/10 !text-foreground !backdrop-blur-xl !shadow-2xl",
      }}
    />
  );
}
