"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ensureTenantLoaded } from "../../../lib/tenant";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000";

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
}
function isValidPassword(pw: string) {
  return !!pw && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}
function onlyDigits(s: string) {
  return String(s || "").replace(/\D+/g, "");
}

export default function RegisterPage() {
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

  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState(""); // dd/MM/AAAA
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // controle de e-mail já cadastrado
  const [emailTaken, setEmailTaken] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const phoneMasked = useMemo(() => {
    const d = onlyDigits(phone).slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
  }, [phone]);

  function validate() {
    if (!name || !birthdate || !phone || !email || !password || !confirmPassword) {
      return "Preencha todos os campos.";
    }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(birthdate)) {
      return "Data de nascimento inválida (use DD/MM/AAAA).";
    }
    if (!isValidEmail(email)) return "Email inválido.";
    if (!isValidPassword(password)) return "A senha deve ter no mínimo 8 caracteres, incluindo letra e número.";
    if (password !== confirmPassword) return "As senhas não coincidem.";
    if (emailTaken) return "Este e-mail já está cadastrado. Faça login ou use outro e-mail.";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const v = validate();
    if (v) { setError(v); return; }

    try {
      setLoading(true);
      const r = await fetch(`${API}/api/client-portal/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({ name, birthdate, phone: phoneMasked, email, password, confirmPassword }),
      });

      // trata 409 (e-mail duplicado) de forma específica
      if (r.status === 409) {
        const data = await r.json().catch(() => ({}));
        setEmailTaken(true);
        setError(data?.error || "Já existe um cliente com este e-mail.");
        // foca o campo de e-mail para correção
        setTimeout(() => emailRef.current?.focus(), 0);
        return;
      }

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Falha ao registrar");

      // se o backend retorna token direto no cadastro, salva e tenta finalizar pendente
      if (data.token) {
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
          console.warn("⚠️ Falha ao finalizar agendamento pendente após registro:", err);
        }
      }

      // fallback: caso não haja token, ou pendente, segue fluxo padrão
      router.push(`/${localStorage.getItem("tenantSlug")}/verificar-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message || "Falha ao registrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border bg-white/90 backdrop-blur p-6 shadow-xl" style={{ borderColor: "#e5e7eb" }}>
          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-6 select-none">
            <div className="relative h-14 w-14 mb-3">
              <img
                src="/assets/images/logo_fundo_transp.png"
                alt="Logo Estety Cloud"
                className="h-14 w-14 object-contain"
              />
            </div>
            <h1 className="text-lg font-semibold" style={{ color: "#9d8983" }}>Estety Cloud</h1>
            <p className="text-xs text-gray-500 mt-1">Portal do Cliente</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Nome completo</label>
              <input
                className="w-full rounded-lg border px-3 py-3 outline-none transition focus:ring-2"
                style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                onFocus={(e)=>e.currentTarget.style.borderColor="#bca49d"}
                onBlur={(e)=>e.currentTarget.style.borderColor="#e5e7eb"}
                placeholder="Seu nome"
                value={name}
                onChange={(e)=>setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Data de nascimento</label>
              <input
                inputMode="numeric"
                maxLength={10}
                className="w-full rounded-lg border px-3 py-3 outline-none transition focus:ring-2"
                style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                onFocus={(e)=>e.currentTarget.style.borderColor="#bca49d"}
                onBlur={(e)=>e.currentTarget.style.borderColor="#e5e7eb"}
                placeholder="DD/MM/AAAA"
                value={birthdate}
                onChange={(e)=> {
                  let v = e.target.value.replace(/\D+/g, "").slice(0,8);
                  if (v.length > 4) v = v.replace(/(\d{2})(\d{2})(\d{0,4})/, "$1/$2/$3");
                  else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,2})/, "$1/$2");
                  setBirthdate(v);
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">WhatsApp</label>
              <input
                inputMode="tel"
                className="w-full rounded-lg border px-3 py-3 outline-none transition focus:ring-2"
                style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                onFocus={(e)=>e.currentTarget.style.borderColor="#bca49d"}
                onBlur={(e)=>e.currentTarget.style.borderColor="#e5e7eb"}
                placeholder="(11) 98888-7777"
                value={phoneMasked}
                onChange={(e)=> setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                ref={emailRef}
                type="email"
                autoComplete="email"
                aria-invalid={emailTaken}
                className="w-full rounded-lg border px-3 py-3 outline-none transition focus:ring-2"
                style={{ borderColor: emailTaken ? "#fecaca" : "#e5e7eb", caretColor: "#9d8983" }}
                onFocus={(e)=>e.currentTarget.style.borderColor=emailTaken ? "#fecaca" : "#bca49d"}
                onBlur={(e)=>e.currentTarget.style.borderColor=emailTaken ? "#fecaca" : "#e5e7eb"}
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e)=> { setEmailTaken(false); setEmail(e.target.value); }}
              />
              {emailTaken && (
                <div
                  role="alert"
                  className="mt-2 rounded-lg border px-3 py-2 text-xs"
                  style={{ borderColor: "#fee2e2", color: "#b91c1c", background: "#fff1f2" }}
                >
                  Este e-mail já está cadastrado.{" "}
                  <button
                    type="button"
                    onClick={() => router.push(`/${localStorage.getItem("tenantSlug")}/login`)}
                    className="underline"
                    style={{ color: "#b91c1c" }}
                  >
                    Faça login
                  </button>{" "}
                  ou use outro e-mail.
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showPw?"text":"password"}
                  autoComplete="new-password"
                  className="w-full rounded-lg border px-3 py-3 pr-20 outline-none transition focus:ring-2"
                  style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                  onFocus={(e)=>e.currentTarget.style.borderColor="#bca49d"}
                  onBlur={(e)=>e.currentTarget.style.borderColor="#e5e7eb"}
                  placeholder="Mín. 8 caracteres, com letra e número"
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={()=>setShowPw(s=>!s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                  style={{ borderColor: "#e5e7eb", color: "#9d8983" }}
                >
                  {showPw?"Ocultar":"Mostrar"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Mín. 8 caracteres, com letra e número.</p>
            </div>

            <div>
              <label className="block text-sm mb-1">Repita a senha</label>
              <div className="relative">
                <input
                  type={showPw2?"text":"password"}
                  autoComplete="new-password"
                  className="w-full rounded-lg border px-3 py-3 pr-20 outline-none transition focus:ring-2"
                  style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                  onFocus={(e)=>e.currentTarget.style.borderColor="#bca49d"}
                  onBlur={(e)=>e.currentTarget.style.borderColor="#e5e7eb"}
                  placeholder="Digite a mesma senha"
                  value={confirmPassword}
                  onChange={(e)=>setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={()=>setShowPw2(s=>!s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                  style={{ borderColor: "#e5e7eb", color: "#9d8983" }}
                >
                  {showPw2?"Ocultar":"Mostrar"}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border px-3 py-2 text-sm"
                   style={{ borderColor: "#fee2e2", color: "#b91c1c", background: "#fff1f2" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || emailTaken}
              className="w-full rounded-xl border py-3 font-medium shadow-sm bg-white hover:bg-gray-50 transition disabled:opacity-60"
              style={{ borderColor: "#bca49d", color: "#9d8983" }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="4" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="#bca49d" strokeWidth="4" />
                  </svg>
                  Enviando…
                </span>
              ) : (
                "Criar conta"
              )}
            </button>
          </form>
        </div>

        {/* Rodapé */}
        <p className="text-center text-[11px] text-gray-400 mt-4">
          © {new Date().getFullYear()} Estety Cloud — Portal do Cliente
        </p>
      </div>
    </main>
  );
}
