"use client";

import { useEffect } from "react";

const KEY = "estetyTenantId";

function isValidSlug(s: string) {
  // letras, números e hífen
  return /^[a-z0-9-]+$/i.test(s);
}

export default function SaveTenant({ tenantId }: { tenantId: string }) {
  useEffect(() => {
    if (tenantId && isValidSlug(tenantId)) {
      try {
        localStorage.setItem(KEY, tenantId);
      } catch {}
    }
  }, [tenantId]);

  return null;
}
