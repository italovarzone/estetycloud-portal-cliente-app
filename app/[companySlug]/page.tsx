import { notFound } from "next/navigation";
import TenantBoot from "./TenantBoot";
import LandingClient from "./LandingClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// nomes reservados que não são tenants
const RESERVED = new Set([
  "favicon.ico", "icon.png", "apple-touch-icon.png",
  "robots.txt", "sitemap.xml"
]);

export default async function TenantLanding({
  params: { companySlug },
}: {
  params: { companySlug: string };
}) {
  debugger;
  if (RESERVED.has(companySlug)) notFound();

  // chama o CONFIG SERVICE para resolver o tenantId
  const res = await fetch(
    `${process.env.CONFIG_SERVICE_BASE}/api/company/by-slug/${companySlug}`,
    { cache: "no-store" }
  );

  if (!res.ok) notFound();

  const company = await res.json();

  // agora obtem o CMS com base no tenantId real
  const cmsRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/cms/${company.tenantId}`,
    { cache: "no-store" }
  );

  if (!cmsRes.ok) {
    console.log(cmsRes);
    console.log(company);
    console.warn("⚠️ CMS não encontrado para", company.tenantId);
    return (
      <main className="p-12 text-center text-gray-500">
        <h1 className="text-2xl font-semibold mb-2">Empresa encontrada</h1>
        <p>Mas ainda não há conteúdo configurado no CMS.</p>
        <p className="mt-4 text-sm text-gray-400">tenantId: {company.tenantId}</p>
      </main>
    );
  }

  const data = await cmsRes.json();

  return (
    <main className="bg-[#f8f9fa] text-[#1D1411]">
      <TenantBoot tenantId={company.tenantId} companySlug={company.slug} />
      <LandingClient tenantId={company.tenantId} data={data} />
    </main>
  );
}
