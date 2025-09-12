"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000";

function isValidPassword(pw: string) {
  return pw && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

export default function LoginPage() {
  const router = useRouter();
  const { tenantId } = useParams<{ tenantId: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (email && !/^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(email)) {
      setError("Email inválido.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("A senha deve ter no mínimo 8 caracteres, incluindo letra e número.");
      return;
    }

    try {
      setLoading(true);
      const r = await fetch(`${API}/api/client-portal/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": String(tenantId || "").trim(),
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Falha no login.");

      localStorage.setItem("clientPortalToken", data.token);
      localStorage.setItem("clientPortalTenant", String(tenantId));

      router.push(`/${tenantId}/home`);
    } catch (err: any) {
      setError(err.message || "Falha no login.");
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
              Estety Cloud
            </h1>
            <p className="text-xs text-gray-500 mt-1">Portal do Cliente</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <div className="relative">
                {/* ícone */}
                <svg
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="w-full rounded-lg border pl-10 pr-3 py-3 outline-none transition focus:ring-2"
                  style={{
                    borderColor: "#e5e7eb",
                    caretColor: "#9d8983",
                    boxShadow: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#bca49d";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Senha</label>
              <div className="relative">
                {/* ícone */}
                <svg
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 10V8a4 4 0 1 1 8 0v2" stroke="currentColor" strokeWidth="1.5" />
                </svg>

                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full rounded-lg border pl-10 pr-12 py-3 outline-none transition focus:ring-2"
                  style={{
                    borderColor: "#e5e7eb",
                    caretColor: "#9d8983",
                    boxShadow: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#bca49d";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                {/* toggle */}
                <button
                  type="button"
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                  style={{ borderColor: "#e5e7eb", color: "#9d8983" }}
                  onClick={() => setShow((s) => !s)}
                >
                  {show ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Mín. 8 caracteres, com letra e número.</p>
            </div>

            {error && (
              <div className="rounded-lg border px-3 py-2 text-sm"
                   style={{ borderColor: "#fee2e2", color: "#b91c1c", background: "#fff1f2" }}>
                {error}
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
                  Entrando…
                </span>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>

        {/* Rodapé pequeno */}
        <p className="text-center text-[11px] text-gray-400 mt-4">
          © {new Date().getFullYear()} Estety Cloud — Portal do Cliente
        </p>
      </div>
    </main>
  );
}
