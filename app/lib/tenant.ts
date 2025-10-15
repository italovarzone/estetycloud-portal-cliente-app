export async function ensureTenantLoaded() {
  // 🚫 SSR guard — impede execução no servidor
  if (typeof window === "undefined") {
    console.warn("⚠️ ensureTenantLoaded() chamado no servidor — ignorado.");
    return null;
  }

  try {
    // 1️⃣ tenta recuperar do localStorage
    const existingId = localStorage.getItem("tenantId");
    const existingSlug = localStorage.getItem("tenantSlug");
    if (existingId && existingSlug) {
      return { tenantId: existingId, slug: existingSlug };
    }

    // 2️⃣ tenta via cookie (somente no client)
    const cookieSlug = getCookie("tenantSlug");
    const slug =
      cookieSlug ||
      window.location.pathname.split("/").filter(Boolean)[0] || "";

    if (!slug) {
      console.warn("⚠️ Nenhum slug detectado na URL.");
      return null;
    }

    const url = `${process.env.CONFIG_SERVICE_BASE}/api/company/by-slug/${slug}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn("⚠️ Tenant não encontrado via slug:", slug, res.status);
      return null;
    }

    const company = await res.json();
    if (company?.tenantId) {
      localStorage.setItem("tenantId", company.tenantId);
      localStorage.setItem("tenantSlug", slug);
      document.cookie = `tenantid=${company.tenantId}; path=/; max-age=86400`;
      console.log("✅ Tenant restaurado via slug:", slug, company.tenantId);
      return { tenantId: company.tenantId, slug };
    }

    console.warn("⚠️ Resposta inválida ao buscar tenant:", company);
    return null;
  } catch (err) {
    console.error("❌ Falha ao buscar tenantId:", err);
    return null;
  }
}

// ✅ helper seguro para client-side
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}
