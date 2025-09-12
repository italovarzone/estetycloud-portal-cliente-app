"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000").replace(/\/$/, "");
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { tenantId } = useParams() as { tenantId: string };
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = typeof window !== "undefined"
        ? localStorage.getItem("clientPortalToken")
        : null;

      if (!tenantId) return;

      if (!token) {
        // dentro do useEffect do AuthGate, no bloco "sem token" OU "token inválido"
        const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
        const search = typeof window !== "undefined" ? window.location.search : "";

        // tira o /{tenantId} do começo → fica só o caminho interno do tenant
        const pathWithinTenant = pathname.replace(new RegExp(`^/${tenantId}(?=/|$)`), "") || "/home";
        const nextParam = `${pathWithinTenant}${search}`;

        router.replace(`/${tenantId}/login?next=${encodeURIComponent(nextParam)}`);
        return;
      }

      try {
        const r = await fetch(`${apiBase()}/api/client-portal/me`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": String(tenantId) },
          cache: "no-store",
        });
        if (!r.ok) throw new Error("unauth");
        if (!cancelled) setOk(true);
      } catch {
        localStorage.removeItem("clientPortalToken");
        router.replace(`/${tenantId}/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [tenantId, router]);

  if (!ok) return <div className="p-6">Carregando…</div>;
  return <>{children}</>;
}
