import { notFound } from "next/navigation";
import TenantBoot from "./TenantBoot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const RESERVED = new Set([
  "favicon.ico",
  "icon.png",
  "apple-touch-icon.png",
  "robots.txt",
  "sitemap.xml",
]);

export default async function Layout({
  children,
  params: { companySlug },
}: {
  children: React.ReactNode;
  params: { companySlug: string };
}) {
  if (RESERVED.has(companySlug)) notFound();
  const res = await fetch(
    `${process.env.CONFIG_SERVICE_BASE}/api/company/by-slug/${companySlug}`,
    { cache: "no-store" }
  );

  if (!res.ok) notFound();

  const company = await res.json();
  const tenantId = company?.tenantId;
  const slug = company?.slug || companySlug;

  if (!tenantId) notFound();

  // 🔥 injeta tenant em todas as rotas (inclusive /login)
  return (
    <html lang="pt-br">
      <body className="min-h-screen bg-[#f8f9fa] text-[#1D1411]">
        <TenantBoot tenantId={tenantId} companySlug={slug} />
        {children}
      </body>
    </html>
  );
}
