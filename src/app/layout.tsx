import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mopol — Verification as a Service",
  description:
    "The Employability ID: a private, candidate-owned identity for work. Employers verify facts in seconds — without ever touching raw records.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="bg-paper text-ink font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
