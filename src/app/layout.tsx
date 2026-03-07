import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crowe AI Onboarding",
  description: "AI-powered onboarding assistant for Crowe AI practice knowledge",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
