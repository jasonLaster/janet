import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { VercelToolbar } from "@vercel/toolbar/next";

const shouldInjectToolbar = process.env.SHOW_VERCEL_TOOLBAR === "true";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {children} {shouldInjectToolbar && <VercelToolbar />}
        </body>
      </html>
    </ClerkProvider>
  );
}
