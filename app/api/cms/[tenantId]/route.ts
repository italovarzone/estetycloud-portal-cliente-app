import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

const OWNER = process.env.CMS_GH_OWNER!;
const REPO  = process.env.CMS_GH_REPO!;
const REF   = process.env.CMS_GH_REF || "main";

/**
 * Mapa de tenantId → nome da pasta do CMS (slug)
 */
const TENANT_FOLDER_MAP: Record<string, string> = {
  "05616ffe-33bc-4f88-b6f5-b43ab3a0a759": "ipv-desenv",
  "187a677b-7d9f-490a-8622-aa131966697c": "livia-moraes",
  "3b5bfc29-2400-41d9-8546-cdc7c4d7f353": "esl",
  "53a60676-fe12-42ba-88c3-0c1ac9fa1189": "tckc",
};

/**
 * Resolve o commit hash da branch principal
 */
async function resolveCommitSha(): Promise<string> {
  try {
    const r = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/commits/${REF}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: process.env.GH_TOKEN ? `Bearer ${process.env.GH_TOKEN}` : "",
        },
        cache: "no-store",
      }
    );
    if (!r.ok) throw new Error(`GitHub API ${r.status}`);
    const json = await r.json();
    return json.sha;
  } catch (err) {
    console.error("[CMS] Falha ao buscar commit:", err);
    return REF;
  }
}

/**
 * Gera URLs possíveis (CDN + RAW)
 */
function makeBases(folder: string, ref: string) {
  const root = `tenants/${folder}`;
  return [
    {
      name: "jsdelivr",
      cfg: `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${ref}/${root}/landing.json`,
      asset: (f: string) =>
        `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${ref}/${root}/${f}`,
      parse: async (r: Response) => r.json(),
    },
    {
      name: "raw",
      cfg: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${ref}/${root}/landing.json`,
      asset: (f: string) =>
        `https://raw.githubusercontent.com/${OWNER}/${REPO}/${ref}/${root}/${f}`,
      parse: async (r: Response) => JSON.parse(await r.text()),
    },
  ];
}

export async function GET(req: Request, { params }: { params: { tenantId: string } }) {
  const { tenantId } = params;

  // 🔍 traduz tenantId → nome da pasta
  const folder = TENANT_FOLDER_MAP[tenantId] ?? tenantId;

  const commitSha = "main";
  const attempts = makeBases(folder, commitSha);

  let cfg: any | null = null;
  let assetBase: ((f: string) => string) | null = null;

  // tenta buscar o landing.json nas bases
  for (const b of attempts) {
    debugger;
    console.log("[CMS] Tentando URL:", b.cfg);
    const res = await fetch(b.cfg, { cache: "no-store" });
    console.log("[CMS] Status:", res.status);
    if (!res.ok) continue;
    cfg = await b.parse(res);
    assetBase = b.asset;
    break;
  }

  if (!cfg || !assetBase) {
    return NextResponse.json(
      { ok: false, error: `landing.json não encontrado para tenantId ${tenantId} (pasta: ${folder})` },
      { status: 404 }
    );
  }

  const abs = (name?: string) =>
    name?.startsWith("http") ? name : name ? assetBase!(name) : undefined;

  return NextResponse.json({
    ok: true,
    tenantId,
    folder,
    branding: cfg.branding ?? { name: "Estúdio", primaryColor: "#bca49d" },
    hero: {
      title: cfg?.hero?.title ?? "",
      subtitle: cfg?.hero?.subtitle ?? "",
      cover: abs(cfg?.hero?.cover),
    },
    services: (cfg?.services ?? []).map((s: any) => ({
      title: s.title,
      desc: s.desc,
      price: s.price,
      image: abs(s.image),
    })),
    gallery: (cfg?.gallery ?? []).map((g: any) => ({
      image: abs(g.image),
      caption: g.caption,
    })),
    about: {
      title: cfg?.about?.title,
      text: cfg?.about?.text,
      photo1: abs(cfg?.about?.photo1),
      photo2: abs(cfg?.about?.photo2),
    },
    contact: cfg?.contact ?? {},
    testimonials: cfg?.testimonials ?? [],
    faq: cfg?.faq ?? [],
  });
}
