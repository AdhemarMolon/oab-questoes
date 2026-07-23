import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Minha OAB",
    template: "%s | Minha OAB",
  },
  description:
    "Simulados, questões e estatísticas para uma preparação organizada para a 1ª fase da OAB.",
  applicationName: "Minha OAB",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#721f2d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
