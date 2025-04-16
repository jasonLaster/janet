import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "./layout-wrapper";

export const metadata: Metadata = {
  title: "PDF Manager",
  description: "Manage and search your PDFs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
