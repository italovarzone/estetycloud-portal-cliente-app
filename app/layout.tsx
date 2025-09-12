// app/layout.tsx
import "./globals.css";
import Pwa from "./pwa"; // registra o service worker (client component)

export const metadata = {
  title: "Portal do Cliente • Estety Cloud",
  description: "Acesso do cliente aos agendamentos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Manifest + ícones */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />

        {/* Cores do app */}
        <meta name="theme-color" content="#bca49d" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Estety Cloud" />
      </head>
      <body>
        {/* registra /sw.js quando o app carrega */}
        <Pwa />
        {children}
      </body>
    </html>
  );
}
