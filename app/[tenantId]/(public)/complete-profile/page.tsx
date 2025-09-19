"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

const API = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000").replace(/\/$/, "");

// helpers
function onlyDigits(s: string) {
  return String(s || "").replace(/\D+/g, "");
}
function maskPhone(raw: string) {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}
function isValidBirthBR(v?: string) {
  if (!v) return true; // opcional
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return false;
  const [dd, mm, yyyy] = v.split("/").map(Number);
  const dt = new Date(yyyy, mm - 1, dd);
  return dt.getFullYear() === yyyy && dt.getMonth() === mm - 1 && dt.getDate() === dd;
}

export default function CompleteProfilePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");     // DD/MM/AAAA
  const [phone, setPhone] = useState("");             // guardamos dígitos
  const phoneMasked = useMemo(() => maskPhone(phone), [phone]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // ===== MOUNT: decide o modo (Bearer vs preToken) e pré-preenche =====
  useEffect(() => {
    const bearer = typeof window !== "undefined" ? localStorage.getItem("clientPortalToken") : null;
    const preToken = typeof window !== "undefined" ? sessionStorage.getItem("clientPortalPreToken") : null;

    // pré-preenche nome (opcional) vindo do login/google
    const preName = typeof window !== "undefined" ? sessionStorage.getItem("clientPortalPreName") : null;
    if (preName) setName(preName);

    // se tiver Bearer, consulta status; se só tiver preToken, já libera o form
    (async () => {
      try {
        if (bearer) {
          const r = await fetch(`${API}/api/client-portal/profile/status`, {
            headers: {
              Authorization: `Bearer ${bearer}`,
              "x-tenant-id": String(tenantId || ""),
            },
            cache: "no-store",
          });
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data?.error || "Falha ao consultar perfil.");

          if (data.needsProfile === false) {
            router.replace(`/${tenantId}/home`);
            return;
          }
          if (data?.profile?.name) setName(String(data.profile.name));
          if (data?.profile?.phone) setPhone(onlyDigits(String(data.profile.phone)));
        } else if (preToken) {
          // cliente ainda não existe — nada de chamada /status
          // (opcional) se houver phone/name guardados do passo anterior, já estão setados
        } else {
          // sem Bearer e sem preToken -> sessão inválida
          router.replace(`/${tenantId}/login`);
          return;
        }
      } catch (e: any) {
        console.warn("[complete-profile] status check:", e?.message);
      } finally {
        setChecking(false);
      }
    })();
  }, [tenantId, router]);

  // ===== SUBMIT =====
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // validações
    if (!String(name).trim()) {
      setError("Informe seu nome.");
      return;
    }
    if (!isValidBirthBR(birthdate)) {
      setError("Data de nascimento inválida (use DD/MM/AAAA).");
      return;
    }
    if (onlyDigits(phone).length < 10) {
      setError("Informe um WhatsApp válido (com DDD).");
      return;
    }

    try {
      setLoading(true);

      const bearer = localStorage.getItem("clientPortalToken");
      const preToken = sessionStorage.getItem("clientPortalPreToken");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-tenant-id": String(tenantId || ""),
      };

      const body: any = {
        name: String(name).trim(),
        phone: phoneMasked,         // backend salva phone e phoneDigits
        birthdate: birthdate || "", // DD/MM/AAAA
      };

      if (bearer) {
        headers.Authorization = `Bearer ${bearer}`;
      } else if (preToken) {
        // fluxo "novo cliente" — ainda não existe no banco deste tenant
        body.preToken = preToken;
      } else {
        setError("Sessão expirada. Faça login novamente.");
        return;
      }

      const r = await fetch(`${API}/api/client-portal/profile/complete`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Falha ao completar perfil.");

      // se vier token novo (caso preToken), persiste e limpa os itens de sessão
      if (data.token) {
        localStorage.setItem("clientPortalToken", data.token);
        localStorage.setItem("clientPortalTenant", String(tenantId));
        sessionStorage.removeItem("clientPortalPreToken");
        sessionStorage.removeItem("clientPortalPreName");
      }

      router.replace(`/${tenantId}/home`);
    } catch (e: any) {
      setError(e.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="text-sm text-gray-500">Verificando seu perfil…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border bg-white/90 backdrop-blur p-6 shadow-xl">
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
            <h1 className="text-lg font-semibold" style={{ color: "#9d8983" }}>Estety Cloud</h1>
            <p className="text-xs text-gray-500 mt-1">Portal do Cliente</p>
          </div>

          <h2 className="text-base font-medium mb-4 text-center">Complete seu perfil para continuar</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome completo (igual ao registro) */}
            <div>
              <label className="block text-sm mb-1">Nome completo</label>
              <input
                className="w-full rounded-lg border px-3 py-3 outline-none transition focus:ring-2"
                style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                onFocus={(e)=> (e.currentTarget.style.borderColor = "#bca49d")}
                onBlur={(e)=> (e.currentTarget.style.borderColor = "#e5e7eb")}
                placeholder="Seu nome"
                value={name}
                onChange={(e)=> setName(e.target.value)}
              />
            </div>

            {/* Data de nascimento */}
            <div>
              <label className="block text-sm mb-1">Data de nascimento</label>
              <input
                inputMode="numeric"
                maxLength={10}
                className="w-full rounded-lg border px-3 py-3 outline-none transition focus:ring-2"
                style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                onFocus={(e)=> (e.currentTarget.style.borderColor = "#bca49d")}
                onBlur={(e)=> (e.currentTarget.style.borderColor = "#e5e7eb")}
                placeholder="DD/MM/AAAA"
                value={birthdate}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D+/g, "").slice(0, 8);
                  if (v.length > 4) v = v.replace(/(\d{2})(\d{2})(\d{0,4})/, "$1/$2/$3");
                  else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,2})/, "$1/$2");
                  setBirthdate(v);
                }}
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm mb-1">WhatsApp</label>
              <input
                inputMode="tel"
                className="w-full rounded-lg border px-3 py-3 outline-none transition focus:ring-2"
                style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                onFocus={(e)=> (e.currentTarget.style.borderColor = "#bca49d")}
                onBlur={(e)=> (e.currentTarget.style.borderColor = "#e5e7eb")}
                placeholder="(11) 98888-7777"
                value={phoneMasked}
                onChange={(e)=> setPhone(onlyDigits(e.target.value))}
              />
            </div>

            {error && (
              <div
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "#fee2e2", color: "#b91c1c", background: "#fff1f2" }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border py-3 font-medium shadow-sm bg-white hover:bg-gray-50 transition disabled:opacity-60"
              style={{ borderColor: "#bca49d", color: "#9d8983" }}
            >
              {loading ? "Salvando..." : "Salvar e continuar"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          © {new Date().getFullYear()} Estety Cloud — Portal do Cliente
        </p>
      </div>
    </main>
  );
}
