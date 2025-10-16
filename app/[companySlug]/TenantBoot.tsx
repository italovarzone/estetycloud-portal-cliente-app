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

    const prevSlug = localStorage.getItem("tenantSlug");
    const prevId = localStorage.getItem("tenantId");

    // se mudou o tenant, força reload após atualizar
    const slugChanged = prevSlug && prevSlug !== companySlug;
    const idChanged = prevId && prevId !== tenantId;

    localStorage.setItem("tenantId", tenantId);
    localStorage.setItem("tenantSlug", companySlug);
    document.cookie = `tenantid=${tenantId}; path=/; max-age=86400`;

    if (slugChanged || idChanged) {
      window.location.reload();
    }
  }, [tenantId, companySlug]);

  return null;
}
