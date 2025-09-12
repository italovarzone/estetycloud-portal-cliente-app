"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const KEY = "estetyTenantId";

export default function RootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    try {
      const tenantId = localStorage.getItem(KEY);
      if (tenantId) {
        router.replace(`/${tenantId}/login`);
        return; // não renderiza o conteúdo abaixo
      }
    } catch {}
    setChecking(false);
  }, [router]);

  if (checking) {
    // evita flicker enquanto checa o localStorage
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-md p-6">
      <h1 className="text-xl font-semibold">Portal do Cliente • Estety Cloud</h1>
      <p className="text-sm text-gray-600 mt-2">
        Acesse via URL com o tenantId, por exemplo: <code>/meu-tenant/login</code>
      </p>
    </main>
  );
}
