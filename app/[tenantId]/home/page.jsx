"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

function apiBase() {
  // garante sem barra no fim e com fallback local
  return (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000").replace(/\/$/, "");
}

export default function HomePage() {
  const router = useRouter();
  const { tenantId } = useParams();

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancel = false;

    async function load() {
      try {
        const token = localStorage.getItem("clientPortalToken");
        if (!tenantId) return; // aguarda params
        if (!token) {
          router.replace(`/${tenantId}/login`);
          return;
        }

        const res = await fetch(`${apiBase()}/api/client-portal/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-tenant-id": String(tenantId),
          },
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("clientPortalToken");
            router.replace(`/${tenantId}/login`);
            return;
          }
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "Falha ao carregar seus dados.");
        }

        const data = await res.json();
        if (!cancel) setMe(data);
      } catch (e) {
        if (!cancel) setErr(String(e.message || e));
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    load();
    return () => {
      cancel = true;
    };
  }, [tenantId, router]);

  if (loading) return <div className="p-6">Carregando…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto w-full max-w-md p-6 space-y-6">
        <header className="text-center">
          <h1 className="text-xl font-semibold">Olá, {me?.name || "Cliente"} 👋</h1>
          <p className="text-sm text-gray-500">{me?.email}</p>
          <p className="text-xs text-gray-400 mt-1">Estety Cloud — Portal do Cliente</p>
        </header>

        <nav className="space-y-3">
          <button
            className="w-full rounded-xl border py-3 font-medium bg-white hover:bg-gray-50"
            style={{ borderColor: "#bca49d", color: "#9d8983" }}
            onClick={() => router.push(`/${tenantId}/meus-agendamentos`)}
          >
            Meus agendamentos
          </button>

          <button
            className="w-full rounded-xl border py-3 font-medium bg-white hover:bg-gray-50"
            style={{ borderColor: "#bca49d", color: "#9d8983" }}
            onClick={() => router.push(`/${tenantId}/novo-agendamento`)}
          >
            Novo agendamento
          </button>
        </nav>

        <button
          className="w-full rounded-xl border py-3 font-medium bg-white hover:bg-gray-50"
          style={{ borderColor: "#bca49d", color: "#9d8983" }}
          onClick={() => {
            localStorage.removeItem("clientPortalToken");
            router.replace(`/${tenantId}/login`);
          }}
        >
          Sair
        </button>
      </div>
    </div>
  );
}
