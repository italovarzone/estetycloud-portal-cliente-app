"use client";

import { useEffect } from "react";

export default function SaveTenant({ tenantId }: { tenantId?: string }) {
  useEffect(() => {
    if (!tenantId) return;
    try {
      // localStorage (PWA/cliente usa isso depois)
      const key = "tenantid";
      if (localStorage.getItem(key) !== tenantId) {
        localStorage.setItem(key, tenantId);
      }

      // cookie (para middleware redirecionar '/' → '/{tenant}')
      const maxAge = 60 * 60 * 24 * 365; // 1 ano
      document.cookie = `tenantid=${encodeURIComponent(
        tenantId
      )}; path=/; max-age=${maxAge}; samesite=lax`;
    } catch {
      // no-op
    }
  }, [tenantId]);

  return null;
}
