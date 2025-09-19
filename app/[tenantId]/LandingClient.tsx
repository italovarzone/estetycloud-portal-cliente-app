"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Cms = {
  branding?: { name?: string; primaryColor?: string };
  hero?: { title?: string; subtitle?: string; cover?: string };
  services?: { title: string; desc?: string; price?: string; image?: string }[];
  gallery?: { image: string; caption?: string }[];
  about?: { title?: string; text?: string; photo?: string };
  contact?: { instagram?: string; whatsapp?: string; address?: string };
  testimonials?: { name: string; text: string; photo?: string }[]; // novo
  faq?: { question: string; answer: string }[];                    // novo
};


export default function LandingClient({
  tenantId,
  data,
}: {
  tenantId: string;
  data: Cms;
}) {
  const brandColor = data?.branding?.primaryColor || "#bca49d";

  // navbar shrink on scroll
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // lightbox
  const [lightbox, setLightbox] = useState<{ src: string; caption?: string } | null>(null);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeLightbox();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeLightbox]);

  // carousel
  const sliderRef = useRef<HTMLDivElement>(null);
  const slideBy = (dir: "left" | "right") => {
    const el = sliderRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  useEffect(() => { console.log("CMS DATA", data); }, [data]);

  if (!data?.hero?.title && !data?.services?.length && !data?.gallery?.length) {
    return <div className="p-6">Conteúdo não carregado (ver console)</div>;
  }

  return (
    <>
      {/* NAVBAR */}
      <nav
        className={`sticky top-0 z-50 transition-all ${scrolled ? "bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm" : "bg-transparent"}`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/images/logo_fundo_transp.png" alt="" className="h-9 w-9" />
            <span className="text-lg md:text-xl font-medium">
              {data?.branding?.name || "Estety Cloud"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/${tenantId}/home`}
              className="px-4 py-2 rounded-xl border"
              style={{ borderColor: brandColor }}
            >
              Agende Agora
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative">
        {data?.hero?.cover && (
          <img
            src={data.hero.cover}
            alt=""
            className="w-full h-[60vh] md:h-[72vh] object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="max-w-7xl mx-auto px-4 py-10 md:py-16">
            <h1 className="text-3xl md:text-6xl font-semibold text-white drop-shadow">
              {data?.hero?.title}
            </h1>
            {data?.hero?.subtitle && (
              <p className="mt-3 md:mt-4 text-lg md:text-2xl text-white/90">
                {data.hero.subtitle}
              </p>
            )}
            <div className="mt-6">
              <Link
                href={`/${tenantId}/home`}
                className="inline-block px-6 py-3 rounded-2xl text-white font-medium shadow-lg"
                style={{ background: brandColor }}
              >
                Agende Agora
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* SERVIÇOS */}
      {!!data?.services?.length && (
        <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="text-2xl md:text-3xl font-semibold">Serviços</h2>
            <Link
              href={`/${tenantId}/home`}
              className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm"
              style={{ border: `1px solid ${brandColor}` }}
            >
              Ver horários
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.services!.map((s, i) => (
              <article
                key={i}
                className="group bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition"
              >
                {s.image && (
                  <button
                    type="button"
                    onClick={() => s.image && setLightbox({ src: s.image, caption: s.title })}
                    className="block w-full"
                    aria-label={`Abrir imagem de ${s.title}`}
                  >
                    <img
                      src={s.image}
                      alt=""
                      className="w-full h-44 md:h-52 object-cover group-hover:scale-[1.02] transition"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                )}
                <div className="p-4">
                  <h3 className="font-medium text-lg">{s.title}</h3>
                  {s.desc && <p className="text-sm opacity-80 mt-1">{s.desc}</p>}
                  {s.price && (
                    <div className="mt-3 font-semibold" style={{ color: brandColor }}>
                      {s.price}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* RESULTADOS (CARROSSEL) */}
      {!!data?.gallery?.length && (
        <section className="bg-white border-y">
          <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl md:text-3xl font-semibold">Resultados</h2>
              <div className="hidden sm:flex gap-2">
                <button
                  onClick={() => slideBy("left")}
                  className="h-10 w-10 rounded-full border hover:bg-gray-50"
                  aria-label="Anterior"
                >
                  ‹
                </button>
                <button
                  onClick={() => slideBy("right")}
                  className="h-10 w-10 rounded-full border hover:bg-gray-50"
                  aria-label="Próximo"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="relative">
              {/* buttons mobile */}
              <div className="sm:hidden absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none">
                <button
                  onClick={() => slideBy("left")}
                  className="pointer-events-auto h-9 w-9 rounded-full bg-white/90 border"
                  aria-label="Anterior"
                >
                  ‹
                </button>
                <button
                  onClick={() => slideBy("right")}
                  className="pointer-events-auto h-9 w-9 rounded-full bg-white/90 border"
                  aria-label="Próximo"
                >
                  ›
                </button>
              </div>

              <div
                ref={sliderRef}
                className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
              >
                {data.gallery!.map((g, i) => (
                  <figure
                    key={i}
                    className="min-w-[82%] sm:min-w-[46%] lg:min-w-[31%] snap-start rounded-xl overflow-hidden border bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => setLightbox({ src: g.image, caption: g.caption })}
                      className="block w-full"
                      aria-label="Abrir imagem grande"
                    >
                      <img
                        src={g.image}
                        alt={g.caption || ""}
                        className="w-full h-64 md:h-72 object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                    {g.caption && (
                      <figcaption className="p-3 text-sm opacity-80">{g.caption}</figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SOBRE */}
      {(data?.about?.photo || data?.about?.text) && (
        <section className="max-w-7xl mx-auto px-4 py-12 md:py-16 grid md:grid-cols-2 gap-8 items-center">
          {data?.about?.photo && (
            <button
              type="button"
              onClick={() => setLightbox({ src: data.about!.photo!, caption: data.about?.title })}
              className="block w-full"
              aria-label="Abrir foto maior"
            >
              <img
                src={data.about.photo}
                alt=""
                className="w-full h-[320px] md:h-[440px] rounded-2xl border object-cover"
                loading="lazy"
                decoding="async"
              />
            </button>
          )}
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-3">
              {data?.about?.title || "Sobre"}
            </h2>
            {data?.about?.text && (
              <p className="opacity-90 whitespace-pre-line leading-relaxed">{data.about.text}</p>
            )}
            <Link
              href={`/${tenantId}/home`}
              className="inline-block mt-6 px-5 py-3 rounded-2xl text-white font-medium shadow"
              style={{ background: brandColor }}
            >
              Agende Agora
            </Link>
          </div>
        </section>
      )}

      {/* CTA FIXA (mobile) */}
      <div className="md:hidden sticky bottom-3 z-40 flex justify-center px-3">
        <Link
          href={`/${tenantId}/home`}
          className="w-full max-w-md text-center px-5 py-3 rounded-2xl text-white font-medium shadow-lg"
          style={{ background: brandColor }}
        >
          Ver horários e agendar
        </Link>
      </div>

      {/* FOOTER */}
      <footer className="mt-12 md:mt-16 border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h4 className="font-semibold mb-2">Contato</h4>
            <ul className="text-sm opacity-80 space-y-1">
              {data?.contact?.whatsapp && (
                <li>
                  <a className="hover:opacity-100" href={`https://wa.me/${data.contact.whatsapp}`} target="_blank">
                    WhatsApp
                  </a>
                </li>
              )}
              {data?.contact?.instagram && (
                <li>
                  <a className="hover:opacity-100" href={`https://instagram.com/${data.contact.instagram}`} target="_blank">
                    Instagram
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs opacity-70">
          © {new Date().getFullYear()} {data?.branding?.name || "Estety Cloud"} • Todos os direitos reservados
        </div>
      </footer>

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur flex items-center justify-center p-4"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
        >
          <figure
            className="max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.src}
              alt={lightbox.caption || ""}
              className="w-full max-h-[82vh] object-contain rounded-xl shadow-2xl"
            />
            {lightbox.caption && (
              <figcaption className="mt-2 text-center text-white/90">{lightbox.caption}</figcaption>
            )}
            <button
              onClick={closeLightbox}
              className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white/90 text-black text-xl"
              aria-label="Fechar"
            >
              ×
            </button>
          </figure>
        </div>
      )}
    </>
  );
}
