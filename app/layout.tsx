import "./globals.css";

export const metadata = {
  title: "Portal do Cliente • Estety Cloud",
  description: "Acesso do cliente aos agendamentos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
