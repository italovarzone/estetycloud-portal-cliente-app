"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

const API = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000").replace(/\/$/, "");

export default function CompleteProfilePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // 1) Ao montar, verifica se o perfil já está completo; se sim, vai pra home
useEffect(() => {
  (async () => {
    try {
      const token = localStorage.getItem("clientPortalToken");
      if (!token) throw new Error("Sessão expirada.");

      // 🔑 repare que a URL não usa tenantId na path
      const r = await fetch(`${API}/api/client-portal/profile/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-id": String(tenantId || ""), // aqui sim
        },
        cache: "no-store",
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Falha ao consultar perfil.");

      // se já estiver completo, sai da página
      if (data.needsProfile === false) {
        router.replace(`/${tenantId}/home`); // aqui sim precisa do tenantId
        return;
      }

      // pré-preenche se tivermos nome/telefone
      if (data?.profile) {
        if (data.profile.name) setName(String(data.profile.name));
        if (data.profile.phone) setPhone(String(data.profile.phone));
      }
    } catch (e: any) {
      console.warn("[complete-profile] status check:", e?.message);
    } finally {
      setChecking(false);
    }
  })();
}, [tenantId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      const token = localStorage.getItem("clientPortalToken");
      if (!token) throw new Error("Sessão expirada.");

      const r = await fetch(`${API}/api/client-portal/profile/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-id": String(tenantId || ""),
        },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Falha ao completar perfil.");

      // perfil completo -> segue pra home
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
            <div>
              <label className="block text-sm mb-1">Nome completo</label>
              <input
                type="text"
                className="w-full rounded-lg border p-3 outline-none"
                style={{ borderColor: "#e5e7eb" }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Telefone</label>
              <input
                type="tel"
                placeholder="(99) 99999-9999"
                className="w-full rounded-lg border p-3 outline-none"
                style={{ borderColor: "#e5e7eb" }}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
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
