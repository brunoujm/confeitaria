import "./globals.css";
import { Providers } from "@/components/providers";

// Environment validation is now done at runtime in server components
// to avoid build-time failures when Vercel build env vars are incomplete
// See src/app/[locale]/layout.tsx for runtime validation

export const metadata = {
  title: "Confeitaria Content Manager",
  description: "Gerenciador de conteúdo para redes sociais de confeitarias",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Confeitaria CM",
  },
};

export const viewport = {
  themeColor: "#E85D75",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Confeitaria CM" />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}