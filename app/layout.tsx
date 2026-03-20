import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/ThemeProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Steep — Active Reading for Professionals",
  description:
    "AI-powered reading comprehension tool. Structured active reading with concept mapping and adversarial questioning.",
};

// Prevent flash of wrong theme before React hydrates
const themeScript = `(function(){var t=localStorage.getItem('steep_theme');if(!t||t==='dark')document.documentElement.classList.add('dark');})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased
          bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
