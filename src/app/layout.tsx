import type { Metadata } from "next";
import LayoutProvider from "@/components/layout/LayoutProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "FieldPro - Field Service Management",
  description:
    "Professional field service management platform for scheduling, job tracking, invoicing, and team coordination.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <LayoutProvider>{children}</LayoutProvider>
      </body>
    </html>
  );
}
