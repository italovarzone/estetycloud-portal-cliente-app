"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Cms = {
  branding?: { name?: string; primaryColor?: string };
  hero?: { title?: string; subtitle?: string; cover?: string };
  services?: { title: string; desc?: string; price?: string; image?: string }[];
  gallery?: { image: string; caption?: string }[];
  about?: { title?: string; text?: string; photo1?: string; photo2?: string };
  contact?: { instagram?: string; whatsapp?: string; address?: string };
  testimonials?: { name: string; text: string; photo?: string }[];
  faq?: { question: string; answer: string }[];
};

export default function LandingClient({
  tenantId,
  data,
}: {
  tenantId: string;
  data: Cms;
}) {
  const brandColor = data?.branding?.primaryColor || "#bca49d";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [lightbox, setLightbox] = useState<{ src: string; caption?: string } | null>(null);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeLightbox();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeLightbox]);

  const sliderRef = useRef<HTMLDivElement>(null);
  const slideBy = (dir: "left" | "right") => {
    const el = sliderRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (!data?.hero?.title && !data?.services?.length && !data?.gallery?.length) {
    return <div className="p-6">Conteúdo não carregado (ver console)</div>;
  }

  return (
    <>
      {/* NAVBAR */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/90 backdrop-blur-md shadow-md"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between transition-all">
          <div className="flex items-center gap-3">
            <img src="/assets/images/logo_fundo_transp.png" alt="" className="h-9 w-9 animate-fadeIn" />
            <span className="text-xl font-semibold tracking-wide">{data?.branding?.name || "Estety Cloud"}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Ícone de pessoa com link "Já é um cliente?" */}
            <Link
              href={`/${localStorage.getItem("tenantSlug")}/home`}
              className="flex flex-col items-center text-xs font-medium hover:opacity-80 transition"
              style={{ color: brandColor }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="w-5 h-5 mb-[2px]"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
              </svg>
              Já é um cliente?
            </Link>
          </div>
        </div>
      </nav>

{/* BOTÃO FIXO DE AGENDAMENTO (FLUTUANTE NO BOTTOM) */}
<Link
  href={`/${localStorage.getItem("tenantSlug")}/novo-agendamento`}
  className="fixed bottom-5 right-5 z-50 px-6 py-3 rounded-full text-sm font-semibold text-white shadow-lg hover:scale-105 transition-transform pulse"
  style={{
    backgroundColor: brandColor,
    fontSize: "18px",
    marginBottom: "10px",
  }}
>
  Agende Agora
</Link>

<style jsx global>{`
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.2);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 25px rgba(0, 0, 0, 0.1);
    }
  }
  .pulse {
    animation: pulse 2.5s ease-in-out infinite;
  }
`}</style>

      {/* HERO
      <header className="relative overflow-hidden">
        {data?.hero?.cover && (
          <img
            src={data.hero.cover}
            alt=""
            className="w-full h-[75vh] object-cover animate-fadeIn"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white px-6">
          <h1 className="text-4xl md:text-6xl font-bold drop-shadow-lg animate-slideDown">
            {data?.hero?.title}
          </h1>
          {data?.hero?.subtitle && (
            <p className="mt-3 md:mt-4 text-lg md:text-2xl text-white/90 animate-fadeIn delay-200">
              {data.hero.subtitle}
            </p>
          )}
          <Link
            href={`/${tenantId}/novo-agendamento`}
            className="mt-8 inline-block px-8 py-3 rounded-full text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
            style={{ background: brandColor }}
          >
            Agende Agora
          </Link>
        </div>
      </header> */}

      {/* SERVIÇOS */}
      {!!data?.services?.length && (
        <section className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 animate-fadeIn">
            Confira todos os nossos serviços
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.services!.map((s, i) => (
              <article
                key={i}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden transition-all transform hover:-translate-y-1"
              >
                {s.image && (
                  <img
                    src={s.image}
                    alt={s.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                <div className="p-6">
                  <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                  {s.desc && <p className="text-sm text-gray-600">{s.desc}</p>}
                  {s.price && (
                    <p className="mt-3 font-semibold text-brand">{s.price}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* GALERIA */}
      {!!data?.gallery?.length && (
        <section className="bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">Resultados</h2>
              <div className="hidden sm:flex gap-2">
                <button onClick={() => slideBy("left")} className="btn border p-2 rounded-full hover:bg-gray-100">‹</button>
                <button onClick={() => slideBy("right")} className="btn border p-2 rounded-full hover:bg-gray-100">›</button>
              </div>
            </div>
            <div ref={sliderRef} className="flex gap-6 overflow-x-auto scroll-smooth pb-4">
              {data.gallery!.map((g, i) => (
                <figure
                  key={i}
                  className="flex flex-col min-w-[82%] sm:min-w-[46%] lg:min-w-[31%] rounded-2xl bg-white shadow-md overflow-hidden transition-transform hover:-translate-y-1"
                >
                  <img
                    src={g.image}
                    alt={g.caption || ""}
                    className="w-full h-64 object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                    onClick={() => setLightbox({ src: g.image, caption: g.caption })}
                  />
                  {g.caption && (
                    <figcaption className="p-4 text-sm text-gray-600 text-center border-t bg-gray-50">
                      {g.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SOBRE 1 */}
      {(data?.about?.photo1 || data?.about?.photo2 || data?.about?.text) && (
        <section className="max-w-7xl mx-auto px-4 py-20 grid md:grid-cols-3 gap-12 items-center">
          
          {/* FOTO 1 */}
          {data.about?.photo1 && (
            <div
              className="animate-slideLeft cursor-pointer hover:scale-105 transition-transform duration-300"
              onClick={() => setLightbox({ src: data.about.photo1 })}
            >
              <img
                src={data.about.photo1}
                alt="Sobre"
                className="w-full rounded-3xl shadow-xl object-cover"
              />
            </div>
          )}

          {/* FOTO 2 */}
          {data.about?.photo2 && (
            <div
              className="animate-slideLeft cursor-pointer hover:scale-105 transition-transform duration-300"
              onClick={() => setLightbox({ src: data.about.photo2 })}
            >
              <img
                src={data.about.photo2}
                alt="Sobre"
                className="w-full rounded-3xl shadow-xl object-cover"
              />
            </div>
          )}

          {/* TEXTO CENTRAL */}
          <div className="w-full flex flex-col items-center text-center justify-center animate-slideRight">
            <h2 className="text-3xl font-bold mb-6">
              {data.about?.title || "Sobre Nós"}
            </h2>

            {Array.isArray(data.about?.text) ? (
              data.about.text.map((t, i) => (
                <p key={i} className="text-gray-700 leading-relaxed mb-4 max-w-2xl">
                  {t}
                </p>
              ))
            ) : (
              <p className="text-gray-700 leading-relaxed max-w-2xl">
                {data.about?.text}
              </p>
            )}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="bg-[#1D1411] text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h4 className="font-semibold mb-3 text-lg">Contato</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              {data?.contact?.whatsapp && (
                <li><a href={`https://wa.me/${data.contact.whatsapp}`} target="_blank">WhatsApp</a></li>
              )}
              {data?.contact?.instagram && (
                <li><a href={`https://instagram.com/${data.contact.instagram}`} target="_blank">Instagram</a></li>
              )}
            </ul>
          </div>
        </div>
        <div className="text-center text-xs opacity-70 py-4 border-t border-white/10">
          © {new Date().getFullYear()} {data?.branding?.name || "Estety Cloud"} — Todos os direitos reservados
        </div>
      </footer>

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[100] animate-fadeIn p-4"
          onClick={closeLightbox}
        >
          <img
            src={lightbox.src}
            alt={lightbox.caption}
            className="max-w-4xl w-full rounded-xl shadow-2xl object-contain"
          />
          {lightbox.caption && (
            <p className="text-white mt-4 text-center text-sm md:text-base max-w-2xl">
              {lightbox.caption}
            </p>
          )}
        </div>
      )}

      {/* Animações */}
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideLeft { from { opacity: 0; transform: translateX(-30px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes slideRight { from { opacity: 0; transform: translateX(30px) } to { opacity: 1; transform: translateX(0) } }
        .animate-fadeIn { animation: fadeIn 0.8s ease forwards; }
        .animate-slideDown { animation: slideDown 1s ease forwards; }
        .animate-slideLeft { animation: slideLeft 1s ease forwards; }
        .animate-slideRight { animation: slideRight 1s ease forwards; }
      `}</style>
    </>
  );
}
