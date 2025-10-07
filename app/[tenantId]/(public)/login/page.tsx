"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Script from "next/script";

const API = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000").replace(/\/$/, "");

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
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

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

    // 👇 trata o next
    const params = new URLSearchParams(window.location.search);
    let next = params.get("next") || "/home";
    if (tenantId && next.startsWith(`/${tenantId}`)) {
      next = next.slice(tenantId.length + 1) || "/home";
    }

    router.replace(`/${tenantId}${next}`);
  } catch (err: any) {
    setError(err.message || "Falha no login.");
  } finally {
    setLoading(false);
  }
}

async function onGoogleCredential(credential: string) {
  try {
    setError("");
    setLoading(true);

    const r = await fetch(`${API}/api/client-portal/login/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": String(tenantId || ""),
      },
      body: JSON.stringify({ idToken: credential }),
    });

    const data = await r.json();
    console.log("🔍 Google Login / resposta:", data);
    if (!r.ok) throw new Error(data?.error || "Falha no login com Google.");

    // ✅ CLIENTE EXISTENTE
    if (data.existing && data.token) {
      const isGoogleUser = !!data.client?.loginGoogle;

      if (!isGoogleUser) {
        console.log("🟢 Primeiro login com Google — confirmando dados...");
        await showConfirmModal(data.client);

        try {
          await fetch(`${API}/api/client-portal/mark-google-confirmed`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-tenant-id": String(tenantId || ""),
              Authorization: `Bearer ${data.token}`,
            },
            body: JSON.stringify({ loginGoogle: true }),
          });
        } catch (err) {
          console.warn("⚠️ Falha ao marcar loginGoogle no servidor:", err);
        }
      } else {
        console.log("⚡ Login automático via Google — já confirmado antes.");
      }

      localStorage.setItem("clientPortalToken", data.token);
      localStorage.setItem("clientPortalTenant", String(tenantId));
      router.replace(`/${tenantId}/home`);
      return;
    }

    // 🚀 NOVO CLIENTE → completar perfil
    if (data.preToken && !data.existing) {
      sessionStorage.setItem("clientPortalPreToken", data.preToken);
      router.replace(`/${tenantId}/complete-profile`);
      return;
    }

    throw new Error("Resposta inesperada do servidor.");
  } catch (e: any) {
    console.error("❌ Erro no login Google:", e);
    setError(e?.message || "Falha no login com Google.");
  } finally {
    setLoading(false);
  }
}

async function showConfirmModal(client: any) {
    // formata a data para DD/MM/YYYY
  function formatDate(dateStr: string) {
    if (!dateStr) return "—";
    // aceita formatos como YYYY-MM-DD ou ISO (com T)
    const clean = String(dateStr).trim();
    const parts = clean.split("T")[0].split("-"); // extrai apenas a parte da data
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
      }
    }
    // fallback: se for outro formato
    return clean;
  }

  // formata o telefone para (XX) XXXXX-XXXX
  function formatPhone(phone: string) {
    if (!phone) return "—";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    if (digits.length === 11)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return phone;
  }

  return new Promise<void>((resolve, reject) => {
    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4";

    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center animate-fadeIn relative">
        <h2 class="text-2xl font-semibold mb-2 text-[#9d8983]">Confirmação de Dados</h2>
        <p class="text-gray-600 text-sm mb-6">
          Antes de continuar, confirme se seus dados abaixo estão corretos. 
          <br/>Essa verificação será exibida apenas <strong>uma única vez</strong> para este e-mail.
        </p>

        <div class="bg-gray-50 border rounded-xl text-left text-sm px-4 py-3 space-y-2 mb-6">
          <div><strong>Nome:</strong> ${client?.name || "—"}</div>
          <div><strong>Data de Nascimento:</strong> ${formatDate(client?.birthdate)}</div>
          <div><strong>WhatsApp:</strong> ${formatPhone(client?.phone)}</div>
          <div><strong>E-mail:</strong> ${client?.email || "—"}</div>
        </div>

        <div class="flex justify-center gap-3 mt-2">
          <button id="cancelBtn"
            class="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100 transition">
            Cancelar
          </button>
          <button id="confirmBtn"
            class="px-5 py-2 rounded-lg text-white font-medium shadow-md hover:opacity-90 transition"
            style="background:#bca49d;border-color:#bca49d;">
            Confirmar e continuar
          </button>
        </div>

        <p class="text-[11px] text-gray-400 mt-5">
          © ${new Date().getFullYear()} Estety Cloud — Portal do Cliente
        </p>
      </div>
    `;

    document.body.appendChild(modal);

    // Fecha modal
    modal.querySelector("#cancelBtn")?.addEventListener("click", () => {
      modal.remove();
      reject(new Error("cancelado"));
    });

    modal.querySelector("#confirmBtn")?.addEventListener("click", () => {
      modal.remove();
      resolve();
    });
  });
}

  /** inicializa o botão do Google quando o script carrega */
  function initGoogle() {
    // @ts-ignore
    if (window.google && googleBtnRef.current) {
      // @ts-ignore
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: (resp: any) => {
          if (resp?.credential) onGoogleCredential(resp.credential);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        context: "signin",
      });
      // @ts-ignore
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        logo_alignment: "left",
        width: 280,
      });
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      {/* GIS script */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogle}
      />

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

          {/* Botão Google */}
          <div className="mb-4 flex justify-center">
            <div ref={googleBtnRef} id="googleSignInDiv" />
          </div>

          {/* Separador */}
          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <div className="relative">
                <svg aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none">
                  <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="w-full rounded-lg border pl-10 pr-3 py-3 outline-none transition focus:ring-2"
                  style={{ borderColor: "#e5e7eb", caretColor: "#9d8983", boxShadow: "none" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#bca49d"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
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
                <svg aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 10V8a4 4 0 1 1 8 0v2" stroke="currentColor" strokeWidth="1.5" />
                </svg>

                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full rounded-lg border pl-10 pr-12 py-3 outline-none transition focus:ring-2"
                  style={{ borderColor: "#e5e7eb", caretColor: "#9d8983", boxShadow: "none" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#bca49d"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

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
              <div className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#fee2e2", color: "#b91c1c", background: "#fff1f2" }}>
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

          <p className="text-center text-sm text-gray-500 mt-4">
            Não tem conta?{" "}
            <button
              type="button"
              onClick={() => router.push(`/${tenantId}/registrar`)}
              className="text-brand hover:underline"
              style={{ color: "#9d8983" }}
            >
              Entre já e agende.
            </button>
          </p>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          © {new Date().getFullYear()} Estety Cloud — Portal do Cliente
        </p>
      </div>
    </main>
  );
}
