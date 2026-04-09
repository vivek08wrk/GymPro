import { Geist, Geist_Mono } from "next/font/google";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import WarmupClient from "./WarmupClient";
import Preloader from "@/components/Preloader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

export const metadata = {
  title: "GymPro - Performance Dashboard",
  description: "Elite fitness tracking and member management system",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${interTight.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-surface text-on-surface">
        <Preloader />
        <WarmupClient />
        {children}
      </body>
    </html>
  );
}
