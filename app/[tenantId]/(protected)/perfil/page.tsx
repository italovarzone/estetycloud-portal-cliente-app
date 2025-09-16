"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000";

type Me = {
  id: string;
  name: string;
  email?: string | null;
  birthdate?: string | null;  // "YYYY-MM-DD"
  phone?: string | null;      // dígitos/máscara
  emailVerified?: boolean;
};

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
}
function isValidPassword(pw: string) {
  return !!pw && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}
function initialsFromName(name?: string) {
  const parts = String(name || "").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}
function ymdToBr(ymd?: string | null) {
  const s = String(ymd || "");
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
function onlyDigits(s: string) {
  return String(s || "").replace(/\D+/g, "");
}
function maskPhone(raw: string) {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}
function only5Digits(v: string) {
  return v.replace(/\D+/g, "").slice(0, 5);
}

export default function ProfilePage() {
  const router = useRouter();
  const { tenantId } = useParams<{ tenantId: string }>();

  const [me, setMe] = useState<Me | null>(null);

  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState(""); // dd/MM/AAAA
  const [phone, setPhone] = useState("");         // mantém só dígitos
  const [email, setEmail] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // verificação de e-mail
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyInfo, setVerifyInfo] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<number | null>(null);

  // dialog alterar senha
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const phoneMasked = useMemo(() => maskPhone(phone), [phone]);
  const initials = initialsFromName(name || me?.name);

  // carrega /me (completo)
  useEffect(() => {
    const token = localStorage.getItem("clientPortalToken");
    if (!token) {
      router.replace(`/${tenantId}/login`);
      return;
    }
    (async () => {
      try {
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

        setName(data.name || "");
        setEmail(data.email || "");
        setBirthdate(ymdToBr(data.birthdate));
        setPhone(onlyDigits(data.phone || "")); // garante só dígitos
      } catch (err: any) {
        setError(err.message || "Falha ao carregar");
      }
    })();

    return () => {
      if (cooldownTimer.current) window.clearInterval(cooldownTimer.current);
    };
  }, [router, tenantId]);

  // timer de cooldown para reenviar código
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownTimer.current = window.setInterval(() => {
      setCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000) as unknown as number;
    return () => {
      if (cooldownTimer.current) window.clearInterval(cooldownTimer.current);
    };
  }, [cooldown]);

  function validateProfile() {
    if (!name) return "Informe seu nome.";
    if (birthdate && !/^\d{2}\/\d{2}\/\d{4}$/.test(birthdate)) {
      return "Data de nascimento inválida (use DD/MM/AAAA).";
    }
    if (email && !isValidEmail(email)) return "Email inválido.";
    return "";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");

    const v = validateProfile();
    if (v) { setError(v); return; }

    try {
      setSaving(true);
      const token = localStorage.getItem("clientPortalToken") || "";
      const body: Record<string, any> = {};
      if (name !== me?.name) body.name = name;
      if (birthdate) body.birthdate = birthdate; // backend aceita DD/MM/AAAA
      if (phoneMasked) body.phone = phoneMasked;
      if (email !== (me?.email || "")) body.email = email;

      if (Object.keys(body).length === 0) {
        setMsg("Nada para atualizar.");
        return;
      }

      const r = await fetch(`${API}/api/client-portal/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": String(tenantId || ""),
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Erro ao atualizar perfil.");

      if (data?.emailVerificationRequired) {
        setMsg("Perfil atualizado. Enviamos um código para o novo e-mail.");
      } else {
        setMsg("Perfil atualizado com sucesso.");
        setTimeout(() => router.push(`/${tenantId}/home`), 700);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendCode() {
    setVerifyError("");
    setVerifyInfo("");
    if (!isValidEmail(email)) {
      setVerifyError("Informe um e-mail válido.");
      return;
    }
    if (cooldown > 0) return;

    try {
      const r = await fetch(`${API}/api/client-portal/resend-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": String(tenantId || ""),
        },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Não foi possível enviar o código.");
      setVerifyInfo("Código enviado para o seu e-mail.");
      setCooldown(60);
    } catch (err: any) {
      setVerifyError(err?.message || "Erro ao enviar código.");
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError("");
    setVerifyInfo("");

    if (!isValidEmail(email)) {
      setVerifyError("Informe um e-mail válido.");
      return;
    }
    if (verifyCode.length !== 5) {
      setVerifyError("Código inválido (5 dígitos).");
      return;
    }

    try {
      const r = await fetch(`${API}/api/client-portal/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": String(tenantId || ""),
        },
        body: JSON.stringify({ email, code: verifyCode }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Falha ao verificar e-mail.");

      if (data?.token) {
        localStorage.setItem("clientPortalToken", data.token);
        localStorage.setItem("clientPortalTenant", String(tenantId));
      }
      router.push(`/${tenantId}/home`);
    } catch (err: any) {
      setVerifyError(err?.message || "Falha ao verificar e-mail.");
    }
  }

  // ====== Alterar Senha (dialog) ======
  function openPwd() {
    setPwdOpen(true);
    setPwdError("");
    setPwdMsg("");
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
    setShowCur(false);
    setShowNew(false);
    setShowConf(false);
  }
  function closePwd() {
    if (pwdSaving) return;
    setPwdOpen(false);
  }
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") closePwd();
    }
    if (pwdOpen) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [pwdOpen, pwdSaving]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");
    setPwdMsg("");

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError("Informe a senha atual e a nova senha (com confirmação).");
      return;
    }
    if (!isValidPassword(newPwd)) {
      setPwdError("A nova senha deve ter no mínimo 8 caracteres, incluindo letra e número.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("A nova senha e a confirmação não coincidem.");
      return;
    }

    try {
      setPwdSaving(true);
      const token = localStorage.getItem("clientPortalToken") || "";
      const r = await fetch(`${API}/api/client-portal/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": String(tenantId || ""),
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPwd,
          newPassword: newPwd,
          confirmNewPassword: confirmPwd,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Erro ao atualizar senha.");

      setPwdMsg("Senha atualizada com sucesso.");
      setTimeout(() => {
        setPwdSaving(false);
        closePwd();
      }, 700);
    } catch (err: any) {
      setPwdError(err?.message || "Erro ao atualizar senha.");
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f7]">
      {/* Topbar simples */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#efe7e5]">
        <div className="mx-auto max-w-3xl px-3 sm:px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push(`/${tenantId}/home`)}
            className="text-sm hover:underline"
            style={{ color: "#9d8983" }}
          >
            ← Voltar
          </button>
          <div className="text-sm font-semibold truncate" style={{ color: "#9d8983" }}>
            Editar perfil
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-3 sm:px-4 py-6 sm:py-8">
        <div
          className="rounded-2xl border bg-white/90 backdrop-blur p-4 sm:p-6 shadow-sm"
          style={{ borderColor: "#efe7e5" }}
        >
          {/* Header com avatar */}
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
            <div
              className="inline-flex items-center justify-center rounded-full shrink-0"
              style={{
                width: 56,
                height: 56,
                background: "#f4eeec",
                color: "#9d8983",
                border: "1px solid #e9dedb",
              }}
              aria-label="Avatar"
            >
              {initials ? (
                <span className="text-lg font-semibold">{initials}</span>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold truncate" style={{ color: "#1D1411" }}>
                {name || me?.name || "Seu nome"}
              </div>
              <div className="text-xs text-gray-500">
                Atualize suas informações de contato e e-mail.
              </div>
            </div>
          </div>

          {/* Form principal */}
          <form onSubmit={handleSave} className="grid gap-4">
            {/* Nome */}
            <div className="min-w-0">
              <label className="block text-sm mb-1">Nome</label>
              <input
                className="w-full rounded-lg border px-3 py-3 outline-none transition focus:ring-2"
                style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#bca49d")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Linha responsiva com 2 colunas a partir do sm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Data de nascimento */}
              <div className="min-w-0">
                <label className="block text-sm mb-1">Data de nascimento</label>
                <input
                  inputMode="numeric"
                  pattern="[0-9/]*"
                  maxLength={10}
                  className="w-full rounded-lg border px-3 py-3 outline-none transition focus:ring-2"
                  style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#bca49d")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
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
              <div className="min-w-0">
                <label className="block text-sm mb-1">WhatsApp</label>
                <input
                  inputMode="tel"
                  autoComplete="tel"
                  className="w-full rounded-lg border px-3 py-3 outline-none transition focus:ring-2"
                  style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#bca49d")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                  placeholder="(11) 98888-7777"
                  value={phoneMasked}
                  onChange={(e) => setPhone(onlyDigits(e.target.value))}
                />
              </div>
            </div>

            {/* Email + Verificação */}
            <div className="min-w-0">
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                autoComplete="email"
                className="w-full rounded-lg border px-3 py-3 outline-none transition focus:ring-2"
                style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#bca49d")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {/* bloco de verificação aparece só se não verificado */}
              {me?.emailVerified === false && (
                <div
                  className="mt-3 rounded-xl border p-3 sm:p-4 bg-white"
                  style={{ borderColor: "#efe7e5" }}
                >
                  <div className="text-sm font-medium mb-2" style={{ color: "#9d8983" }}>
                    Verifique seu e-mail
                  </div>

                  {/* Mobile: empilha | Desktop: lado a lado */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={cooldown > 0}
                      className="w-full sm:w-auto rounded-lg border px-3 py-2 bg-white hover:bg-gray-50 disabled:opacity-60"
                      style={{ borderColor: "#bca49d", color: "#9d8983" }}
                    >
                      {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Enviar código"}
                    </button>

                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={5}
                      className="w-full sm:w-24 rounded-lg border px-3 py-2 outline-none"
                      style={{ borderColor: "#e5e7eb", caretColor: "#9d8983", letterSpacing: "0.25em" }}
                      placeholder="00000"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(only5Digits(e.target.value))}
                    />

                    <button
                      type="button"
                      onClick={handleVerify}
                      className="w-full sm:w-auto rounded-lg border px-3 py-2 bg-white hover:bg-gray-50"
                      style={{ borderColor: "#bca49d", color: "#9d8983" }}
                    >
                      Verificar
                    </button>
                  </div>

                  {verifyError && (
                    <div
                      className="mt-2 rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: "#fee2e2", color: "#b91c1c", background: "#fff1f2" }}
                    >
                      {verifyError}
                    </div>
                  )}
                  {verifyInfo && (
                    <div
                      className="mt-2 rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: "#DEF7EC", color: "#03543F", background: "#F3FAF7" }}
                    >
                      {verifyInfo}
                    </div>
                  )}

                  <p className="text-[11px] text-gray-500 mt-2">
                    Se mudar o e-mail, vamos pedir verificação novamente.
                  </p>
                </div>
              )}
            </div>

            {/* mensagens gerais */}
            {error && (
              <div
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "#fee2e2", color: "#b91c1c", background: "#fff1f2" }}
              >
                {error}
              </div>
            )}
            {msg && (
              <div
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "#DEF7EC", color: "#03543F", background: "#F3FAF7" }}
              >
                {msg}
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto rounded-xl border px-4 py-2.5 bg-white hover:bg-gray-50 transition disabled:opacity-60"
                style={{ borderColor: "#bca49d", color: "#9d8983" }}
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="4" />
                      <path d="M22 12a10 10 0 0 1-10 10" stroke="#bca49d" strokeWidth="4" />
                    </svg>
                    Salvando…
                  </span>
                ) : (
                  "Salvar alterações"
                )}
              </button>

              <button
                type="button"
                onClick={openPwd}
                className="w-full sm:w-auto rounded-xl border px-4 py-2.5 bg-white hover:bg-gray-50 transition"
                style={{ borderColor: "#bca49d", color: "#9d8983" }}
              >
                Alterar senha
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ===== Dialog Alterar Senha ===== */}
      {pwdOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={closePwd}
          />
          {/* modal */}
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl border bg-white shadow-xl p-4 sm:p-6"
            style={{ borderColor: "#efe7e5" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-base font-semibold" style={{ color: "#1D1411" }}>
                Alterar senha
              </div>
              <button
                onClick={closePwd}
                className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                style={{ borderColor: "#e5e7eb", color: "#9d8983" }}
                aria-label="Fechar"
              >
                Fechar
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Use uma senha com pelo menos 8 caracteres, contendo letra e número.
            </p>

            <form onSubmit={handleChangePassword} className="grid gap-3">
              {/* Senha atual */}
              <div>
                <label className="block text-sm mb-1">Senha atual</label>
                <div className="relative">
                  <input
                    type={showCur ? "text" : "password"}
                    autoComplete="current-password"
                    className="w-full rounded-lg border pr-20 px-3 py-3 outline-none"
                    style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#bca49d")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCur((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                    style={{ borderColor: "#e5e7eb", color: "#9d8983" }}
                  >
                    {showCur ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              {/* Nova senha */}
              <div>
                <label className="block text-sm mb-1">Nova senha</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    autoComplete="new-password"
                    className="w-full rounded-lg border pr-20 px-3 py-3 outline-none"
                    style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#bca49d")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                    style={{ borderColor: "#e5e7eb", color: "#9d8983" }}
                  >
                    {showNew ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Mín. 8 caracteres, com letra e número.</p>
              </div>

              {/* Confirmar nova senha */}
              <div>
                <label className="block text-sm mb-1">Confirmar nova senha</label>
                <div className="relative">
                  <input
                    type={showConf ? "text" : "password"}
                    autoComplete="new-password"
                    className="w-full rounded-lg border pr-20 px-3 py-3 outline-none"
                    style={{ borderColor: "#e5e7eb", caretColor: "#9d8983" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#bca49d")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConf((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                    style={{ borderColor: "#e5e7eb", color: "#9d8983" }}
                  >
                    {showConf ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              {/* mensagens */}
              {pwdError && (
                <div
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "#fee2e2", color: "#b91c1c", background: "#fff1f2" }}
                >
                  {pwdError}
                </div>
              )}
              {pwdMsg && (
                <div
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "#DEF7EC", color: "#03543F", background: "#F3FAF7" }}
                >
                  {pwdMsg}
                </div>
              )}

              {/* ações */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="submit"
                  disabled={pwdSaving}
                  className="w-full sm:w-auto rounded-xl border px-4 py-2.5 bg-white hover:bg-gray-50 transition disabled:opacity-60"
                  style={{ borderColor: "#bca49d", color: "#9d8983" }}
                >
                  {pwdSaving ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="4" />
                        <path d="M22 12a10 10 0 0 1-10 10" stroke="#bca49d" strokeWidth="4" />
                      </svg>
                      Salvando…
                    </span>
                  ) : (
                    "Salvar nova senha"
                  )}
                </button>

                <button
                  type="button"
                  disabled={pwdSaving}
                  onClick={closePwd}
                  className="w-full sm:w-auto rounded-xl border px-4 py-2.5 bg-white hover:bg-gray-50 transition"
                  style={{ borderColor: "#e5e7eb", color: "#9d8983" }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
