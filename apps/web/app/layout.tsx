import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "./layout-wrapper";
import { ClerkProvider } from "@clerk/nextjs";

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
    <ClerkProvider>
      <html lang="en">
        <body>
          <LayoutWrapper>{children}</LayoutWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}
