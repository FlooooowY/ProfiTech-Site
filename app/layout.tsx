import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AIAssistant from "@/components/AIAssistant";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProfiTech - Профессиональное оборудование для бизнеса",
  description: "От идеи до воплощения. Широкий выбор профессионального оборудования: кофемашины, холодильное оборудование, мебель и многое другое.",
  keywords: "профессиональное оборудование, кофемашины, холодильное оборудование, промышленная мебель",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Получаем сообщения для дефолтной локали
  const messages = await getMessages();
  const locale = routing.defaultLocale;

  return (
    <html lang={locale} className="overflow-x-hidden w-full max-w-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden w-full max-w-full`}
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Header />
          <main className="pt-16 md:pt-20 min-h-screen w-full max-w-full overflow-x-hidden bg-white">
            {children}
          </main>
          <Footer />
          <AIAssistant />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
