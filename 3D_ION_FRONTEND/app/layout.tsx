import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AMRAD",
  description: "Plataforma científica para gestão e análise de experimentos com materiais impressos em 3D sob radiação ionizante",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased flex flex-col min-h-screen min-h-dvh bg-background text-foreground overflow-x-clip`}>
        <AuthProvider>
          <LanguageProvider>
            <Header />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
