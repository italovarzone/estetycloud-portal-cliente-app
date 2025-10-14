import { useEffect, useState } from "react";

/**
 * Detecta se o usuário está inativo em relação ao scroll.
 * Retorna true quando o scroll está parado por `delay` milissegundos.
 */
export function useScrollIdle(delay: number = 2000): boolean {
  const [idle, setIdle] = useState(true);
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleScroll = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), delay);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [delay]);

  return idle;
}
