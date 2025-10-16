"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ensureTenantLoaded } from "../../../lib/tenant";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000";

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
}

export default function VerifyEmailPage() {
  const router = useRouter();

  const [tenantId, setTenantId] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("tenantId") || "" : ""
  );

  useEffect(() => {
    (async () => {
      if (!tenantId) {
        const t = await ensureTenantLoaded();
        if (t?.tenantId) {
          setTenantId(t.tenantId);
        } else {
          console.warn("⚠️ Nenhum tenant encontrado para esta rota.");
        }
      }
    })();
  }, [tenantId]);

  useEffect(() => {
    const id = localStorage.getItem("tenantId");
    if (id) setTenantId(id);
  }, []);

  const search = useSearchParams();

  const emailFromUrl = search.get("email") || "";

  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0); // segundos para reenviar

  // mantém email do query sincronizado
  useEffect(() => setEmail(emailFromUrl), [emailFromUrl]);

  // contador regressivo para reenvio
  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function only5Digits(v: string) {
    return v.replace(/\D+/g, "").slice(0, 5);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!isValidEmail(email)) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (code.length !== 5) {
      setError("Código inválido (5 dígitos).");
      return;
    }

    try {
      setLoading(true);
      const r = await fetch(`${API}/api/client-portal/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({ email, code }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Falha ao verificar e-mail.");

      if (data?.token) {
        localStorage.setItem("clientPortalToken", data.token);
        localStorage.setItem("clientPortalTenant", String(tenantId));
        try {
          const pendingRaw = sessionStorage.getItem("pendingAppointment");
          if (pendingRaw) {
            const pending = JSON.parse(pendingRaw);
            const token = localStorage.getItem("clientPortalToken") || "";

            const url = pending.isEditing && pending.editId
              ? `${API}/api/client-portal/appointments/${encodeURIComponent(String(pending.editId))}`
              : `${API}/api/client-portal/appointments`;
            const method = pending.isEditing ? "PUT" : "POST";

            const r2 = await fetch(url, {
              method,
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "x-tenant-id": pending.tenantId,
              },
              body: JSON.stringify(pending.payload),
            });

            const data2 = await r2.json().catch(() => ({}));
            if (r2.ok) {
              const total = pending.payload.procedures.reduce((s: number, p: any) => s + Number(p.price || 0), 0);
              const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
              const summary = {
                id: data2.id,
                date: pending.payload.date,
                time: pending.payload.time,
                total: BRL.format(total),
                procs: pending.payload.procedures.map((p: any) => p.name),
              };

              sessionStorage.setItem("lastCreatedAppointment", JSON.stringify(summary));
              sessionStorage.removeItem("pendingAppointment");
              sessionStorage.setItem("bookedAfterLogin", "1");
              router.replace(`/${localStorage.getItem("tenantSlug")}/novo-agendamento/sucesso`);
              return;
            }
          }
        } catch (err) {
          console.warn("⚠️ Falha ao finalizar agendamento pendente após verificação de e-mail:", err);
        }
      }

      // fallback padrão: caso não haja pendente ou falha
      router.push(`/${localStorage.getItem("tenantSlug")}/home`);
    } catch (err: any) {
      setError(err?.message || "Falha ao verificar e-mail.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setInfo("");
    if (!isValidEmail(email)) {
      setError("Informe um e-mail válido para reenviar.");
      return;
    }
    if (cooldown > 0) return;

    try {
      setLoading(true);
      const r = await fetch(`${API}/api/client-portal/resend-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": String(tenantId || ""),
        },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Não foi possível reenviar o código.");
      setInfo("Código reenviado para o seu e-mail.");
      setCooldown(60); // antispam simples no front
    } catch (err: any) {
      setError(err?.message || "Erro ao reenviar o código.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl border bg-white/90 backdrop-blur p-6 shadow-xl">
          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative h-14 w-14 mb-3">
              <Image
                src="/assets/images/logo_fundo_transp.png"
                alt="Logo Estety Cloud"
                width={56}
                height={56}
                className="h-14 w-14 object-contain select-none"
                priority
              />
            </div>
            <h1 className="text-lg font-semibold" style={{ color: "#9d8983" }}>
              Verificação de e-mail
            </h1>
            <p className="text-xs text-gray-500 mt-1">Portal do Cliente</p>
          </div>

          {/* Form */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border px-3 py-3 outline-none transition focus:ring-2"
                style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#bca49d")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Código de verificação</label>
              <input
                inputMode="numeric"
                maxLength={5}
                className="tracking-widest text-center text-lg w-full rounded-lg border px-3 py-3 outline-none transition focus:ring-2"
                style={{ borderColor: "#e5e7eb", caretColor: "#9d8983", letterSpacing: "0.35em" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#bca49d")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                placeholder="00000"
                value={code}
                onChange={(e) => setCode(only5Digits(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enviamos um código de 5 dígitos para o seu e-mail.
              </p>
            </div>

            {error && (
              <div
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "#fee2e2", color: "#b91c1c", background: "#fff1f2" }}
              >
                {error}
              </div>
            )}

            {info && (
              <div
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "#DEF7EC", color: "#03543F", background: "#F3FAF7" }}
              >
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border py-3 font-medium shadow-sm bg-white hover:bg-gray-50 transition disabled:opacity-60"
              style={{ borderColor: "#bca49d", color: "#9d8983" }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="4" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="#bca49d" strokeWidth="4" />
                  </svg>
                  Verificando…
                </span>
              ) : (
                "Verificar e entrar"
              )}
            </button>
          </form>

          {/* Ações secundárias */}
          <div className="flex items-center justify-between text-sm mt-4">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || loading}
              className="rounded-md border px-3 py-1.5 bg-white hover:bg-gray-50 disabled:opacity-60"
              style={{ borderColor: "#bca49d", color: "#9d8983" }}
            >
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/${localStorage.getItem("tenantSlug")}/login`)}
              className="text-xs text-gray-500 hover:underline"
            >
              Verificar depois, faça o login.
            </button>
          </div>
        </div>

        {/* Rodapé pequeno */}
        <p className="text-center text-[11px] text-gray-400 mt-4">
          © {new Date().getFullYear()} Estety Cloud — Portal do Cliente
        </p>
      </div>
    </main>
  );
}
