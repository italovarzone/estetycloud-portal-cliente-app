export async function ensureTenantLoaded() {
  if (typeof window === "undefined") return null;

  // tenta do localStorage primeiro
  const existingId = localStorage.getItem("tenantId");
  const existingSlug = localStorage.getItem("tenantSlug");
  if (existingId && existingSlug) return { tenantId: existingId, slug: existingSlug };

  // tenta do cookie ou URL
  const cookieSlug = getCookie("tenantSlug");
  const slug = cookieSlug || window.location.pathname.split("/").filter(Boolean)[0];
  if (!slug) return null;

  try {
    const res = await fetch(`/api/company/by-slug/${slug}`);
    if (!res.ok) return null;
    const company = await res.json();
    if (company?.tenantId) {
      localStorage.setItem("tenantId", company.tenantId);
      localStorage.setItem("tenantSlug", slug);
      document.cookie = `tenantid=${company.tenantId}; path=/; max-age=86400`;
      console.log("✅ Tenant restaurado via slug:", slug, company.tenantId);
      return { tenantId: company.tenantId, slug };
    }
  } catch (e) {
    console.error("⚠️ Falha ao buscar tenantId:", e);
  }
  return null;
}

// helper simples de cookie
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}
