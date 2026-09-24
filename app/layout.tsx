import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Susan AI — Sanket Pixel Technologies",
  description: "A private, multi-model AI workspace with browser-local conversation history and Bring Your Own Key support.",
  applicationName: "Susan AI",
  keywords: ["AI chat", "BYOK", "DeepSeek", "Claude", "Gemini", "OpenAI"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/susan-logo.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-bg-main text-text-main`}
      >
        {children}
      </body>
    </html>
  );
}
