import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import TrpcProvider from "@/components/TrpcProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <TrpcProvider>
        <html lang="en">
          <body>{children}</body>
        </html>
      </TrpcProvider>
    </ClerkProvider>
  );
}
