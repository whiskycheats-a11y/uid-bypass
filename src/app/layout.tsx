import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import SecurityGuard from "@/components/security-guard";

export const metadata: Metadata = {
  title: "UID BYPASS RESELLER — Reseller Panel",
  description: "Professional UID management and bypass reseller platform.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`font-sans`}>
        <SessionProvider>
          <ThemeProvider>
            <SecurityGuard />
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
