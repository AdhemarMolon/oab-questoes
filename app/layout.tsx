import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OAB Questões",
  description: "Plataforma de estudo com questões de exames anteriores da OAB.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
