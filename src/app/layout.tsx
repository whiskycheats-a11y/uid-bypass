import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import SecurityGuard from "@/components/security-guard";
import NextTopLoader from 'nextjs-toploader';

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
            <NextTopLoader 
              color="#06b6d4" 
              initialPosition={0.08} 
              crawlSpeed={200} 
              height={3} 
              crawl={true} 
              showSpinner={true} 
              easing="ease" 
              speed={200} 
              shadow="0 0 10px #06b6d4,0 0 5px #06b6d4" 
            />
            <SecurityGuard />
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
