export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className="min-h-screen bg-[#f8f9fa] text-[#1D1411]">
        {children}
      </body>
    </html>
  );
}
