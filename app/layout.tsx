import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OAB Questões",
    template: "%s | OAB Questões",
  },
  description:
    "Simulados, questões e estatísticas para uma preparação organizada para a 1ª fase da OAB.",
  applicationName: "OAB Questões",
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
