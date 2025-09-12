export const metadata = {
  title: "Portal do Cliente • Estety Cloud",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function TenantLayout({ children }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      {children}
    </main>
  );
}

