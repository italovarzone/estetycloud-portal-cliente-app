"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000";

type Me = {
  id: string;
  name: string;
  email?: string | null;
  birthdate?: string | null;
  phone?: string | null;
  emailVerified?: boolean;
};

function initialsFromName(name?: string) {
  const parts = String(name || "").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}
function onlyDigits(s: string) {
  return String(s || "").replace(/\D+/g, "");
}

/** Skeletons */
function SkeletonProfileCard() {
  return (
    <div className="rounded-2xl border bg-white/90 backdrop-blur p-6 shadow-sm" style={{ borderColor: "#efe7e5" }}>
      <div className="flex items-start gap-4 min-w-0 animate-pulse">
        <div className="h-16 w-16 rounded-full bg-gray-200" />
        <div className="flex-1 min-w-0 space-y-3">
          <div className="h-5 w-2/3 rounded bg-gray-200" />
          <div className="h-4 w-4/5 rounded bg-gray-100" />
          <div className="h-4 w-full rounded bg-gray-100" />
          <div className="h-4 w-2/3 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
function SkeletonSideCard() {
  return (
    <div className="rounded-2xl border bg-white/90 backdrop-blur p-6 shadow-sm animate-pulse" style={{ borderColor: "#efe7e5" }}>
      <div className="h-5 w-1/2 rounded bg-gray-200 mb-3" />
      <div className="h-4 w-full rounded bg-gray-100 mb-2" />
      <div className="h-4 w-5/6 rounded bg-gray-100 mb-4" />
      <div className="h-10 w-full rounded-xl bg-gray-200" />
      <div className="h-10 w-full rounded-xl bg-gray-200 mt-3" />
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { tenantId } = useParams<{ tenantId: string }>();

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("clientPortalToken");
    if (!token) {
      router.replace(`/${tenantId}/login`);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API}/api/client-portal/me`, {
          headers: {
            "Content-Type": "application/json",
            "x-tenant-id": String(tenantId || ""),
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Falha ao carregar");

        setMe({
          id: data.id,
          name: data.name,
          email: data.email ?? null,
          birthdate: data.birthdate ?? null,
          phone: data.phone ?? null,
          emailVerified: !!data.emailVerified,
        });
      } catch (err: any) {
        setError(err.message || "Falha ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, tenantId]);

  const isProfileComplete = useMemo(() => {
    if (!me) return false;
    const hasName = !!String(me.name || "").trim();
    const hasEmail = !!String(me.email || "").trim();
    const hasBirth = !!String(me.birthdate || "").trim();
    const phoneDigits = onlyDigits(me.phone || "");
    const hasPhone = phoneDigits.length >= 10;
    return hasName && hasEmail && me.emailVerified === true && hasBirth && hasPhone;
  }, [me]);

  function go(path: string) {
    router.push(`/${tenantId}${path}`);
  }

  function handleLogout() {
    try {
      localStorage.removeItem("clientPortalToken");
      localStorage.removeItem("clientPortalTenant");
    } catch {}
    router.replace(`/${tenantId}/login`);
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const firstName = me?.name?.split(" ")[0] || "Cliente";
  const initials = initialsFromName(me?.name);

  return (
    <main className="min-h-screen bg-[#faf8f7] overflow-x-hidden">
      {/* Topbar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#efe7e5]">
        <div className="mx-auto w-full max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/assets/images/logo_fundo_transp.png"
              alt="Logo Estety Cloud"
              width={32}
              height={32}
              className="h-8 w-8 object-contain select-none flex-shrink-0"
              priority
            />
            <div className="leading-tight min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: "#9d8983" }}>
                Estety Cloud
              </div>
              <div className="text-[11px] text-gray-500 truncate">Portal do Cliente</div>
            </div>
          </div>

          {/* Avatar + menu */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((s) => !s)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="inline-flex items-center justify-center rounded-full focus:outline-none"
              style={{
                width: 36,
                height: 36,
                background: "#f4eeec",
                color: "#9d8983",
                border: "1px solid #e9dedb",
              }}
              title={me?.name || "Conta"}
            >
              {initials ? (
                <span className="text-sm font-semibold">{initials}</span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              )}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-40 max-w-[calc(100vw-1rem)] rounded-xl border bg-white shadow-lg overflow-hidden"
                style={{ borderColor: "#efe7e5" }}
              >
                <button
                  role="menuitem"
                  onClick={() => go("/perfil")}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  style={{ color: "#1D1411" }}
                >
                  Meu perfil
                </button>
                <div className="h-px" style={{ background: "#efe7e5" }} />
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  style={{ color: "#9d8983" }}
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        {loading ? (
          <section className="grid gap-6 md:grid-cols-2">
            <SkeletonProfileCard />
            <SkeletonSideCard />
          </section>
        ) : (
          <section className="grid gap-6 md:grid-cols-2">
            {/* Cartão perfil */}
            <div className="rounded-2xl border bg-white/90 backdrop-blur p-6 shadow-sm min-w-0" style={{ borderColor: "#efe7e5" }}>
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className="inline-flex items-center justify-center rounded-full shrink-0"
                  style={{
                    width: 64,
                    height: 64,
                    background: "#f4eeec",
                    color: "#9d8983",
                    border: "1px solid #e9dedb",
                  }}
                  aria-label="Avatar"
                >
                  {initials ? (
                    <span className="text-xl font-semibold">{initials}</span>
                  ) : (
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-semibold truncate" style={{ color: "#1D1411" }}>
                    Olá, {firstName}! 👋
                  </h1>

                  {!isProfileComplete && (
                    <p className="text-sm text-gray-600 mt-1">
                      Complete seus dados para liberar agendamentos.
                    </p>
                  )}

                  {/* e-mail */}
                  <div className="mt-4 grid gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" className="text-gray-500 flex-shrink-0" fill="none" aria-hidden>
                        <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                      <span className="truncate flex-1">{me?.email || "—"}</span>
                      {me?.emailVerified ? (
                        <span
                          className="ml-2 rounded-full border px-2 py-0.5 text-[11px] flex-shrink-0"
                          style={{ borderColor: "#e9dedb", color: "#03543F", background: "#F3FAF7" }}
                        >
                          verificado
                        </span>
                      ) : (
                        <span
                          className="ml-2 rounded-full border px-2 py-0.5 text-[11px] flex-shrink-0"
                          style={{ borderColor: "#fde2e2", color: "#b91c1c", background: "#fff1f2" }}
                        >
                          não verificado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cartão lateral condicional */}
            {!isProfileComplete ? (
              <div className="rounded-2xl border bg-white/90 backdrop-blur p-6 shadow-sm min-w-0" style={{ borderColor: "#efe7e5" }}>
                <h2 className="text-base font-semibold mb-2" style={{ color: "#9d8983" }}>
                  Finalize seu cadastro
                </h2>
                <p className="text-sm text-gray-600">
                  Preencha data de nascimento, WhatsApp e verifique seu e-mail para liberar os agendamentos.
                </p>

                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={() => go("/perfil")}
                    className="w-full rounded-xl border py-2.5 font-medium bg-white hover:bg-gray-50 transition"
                    style={{ borderColor: "#bca49d", color: "#9d8983" }}
                  >
                    Completar agora
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border bg-white/90 backdrop-blur p-6 shadow-sm min-w-0" style={{ borderColor: "#efe7e5" }}>
                <h2 className="text-base font-semibold mb-3" style={{ color: "#9d8983" }}>
                  Ações rápidas
                </h2>
                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => go("/novo-agendamento")}
                    className="w-full rounded-xl border py-2.5 font-medium bg-white hover:bg-gray-50 transition"
                    style={{ borderColor: "#bca49d", color: "#9d8983" }}
                  >
                    Agendar
                  </button>
                  <button
                    type="button"
                    onClick={() => go("/meus-agendamentos")}
                    className="w-full rounded-xl border py-2.5 font-medium bg-white hover:bg-gray-50 transition"
                    style={{ borderColor: "#bca49d", color: "#9d8983" }}
                  >
                    Meus agendamentos
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {error && !loading && (
          <div
            className="mt-6 rounded-xl border px-4 py-3 text-sm"
            style={{ borderColor: "#fee2e2", color: "#b91c1c", background: "#fff1f2" }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Reforço global contra overflow lateral em mobile */}
      <style jsx global>{`
        html, body { overflow-x: hidden; }
        img, video { max-width: 100%; height: auto; }
      `}</style>
    </main>
  );
}
