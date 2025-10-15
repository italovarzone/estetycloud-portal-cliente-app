import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const slug = url.pathname.split("/").filter(Boolean)[0]; // exemplo: "ipv-desenv"

  // Ignora APIs, assets e rotas internas
  if (
    !slug ||
    slug.startsWith("api") ||
    slug.startsWith("_next") ||
    slug.startsWith("favicon") ||
    slug.startsWith("robots") ||
    slug.startsWith("sitemap") ||
    slug.startsWith(".well-known")
  ) {
    return NextResponse.next();
  }

  // Cria ou mantém cookie com o slug atual
  const res = NextResponse.next();
  const existing = req.cookies.get("tenantSlug")?.value;

  if (slug && slug !== existing) {
    res.cookies.set("tenantSlug", slug, { path: "/", maxAge: 86400 });
    console.log("🌐 Middleware definiu tenantSlug =", slug);
  }

  return res;
}

export const config = {
  matcher: [
    // Aplica a todas as rotas exceto as internas
    "/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|assets|static).*)",
  ],
};
