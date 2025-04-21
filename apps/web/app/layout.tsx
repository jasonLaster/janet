import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { PdfStoreProvider } from "@/components/pdf-store-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <PdfStoreProvider debug={process.env.NODE_ENV === "development"}>
            {children}
          </PdfStoreProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
