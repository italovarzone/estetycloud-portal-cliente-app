"use client";

import { useEffect } from "react";

export default function TenantBoot({
  tenantId,
  companySlug,
}: {
  tenantId: string;
  companySlug: string;
}) {
  useEffect(() => {
    if (!tenantId) return;
    localStorage.setItem("tenantId", tenantId);
    localStorage.setItem("tenantSlug", companySlug);
    document.cookie = `tenantid=${tenantId}; path=/; max-age=86400`;
  }, [tenantId, companySlug]);

  return null;
}
