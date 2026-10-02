import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exito — Business Operating System",
  description: "The internal operating system for the businesses we build.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
