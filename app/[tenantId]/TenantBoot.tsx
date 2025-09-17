"use client";

import { useEffect } from "react";

export default function TenantBoot({ tenantId }: { tenantId: string }) {
  useEffect(() => {
    // alinha com seu fetch wrapper que manda Authorization/x-tenant
    localStorage.setItem("tenantKey", tenantId);
  }, [tenantId]);
  return null;
}
