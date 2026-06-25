import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

function getAllowedRedirectOrigins(): string[] | undefined {
  const origins = new Set<string>();
  const urls = [
    process.env.ELEVENLABS_CUSTOM_LLM_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.ALLOWED_DEV_ORIGINS,
  ].filter(Boolean) as string[];

  for (const entry of urls) {
    for (const part of entry.split(",")) {
      const value = part.trim();
      if (!value) continue;
      try {
        origins.add(new URL(value).origin);
      } catch {
        // ignore invalid URLs
      }
    }
  }

  return origins.size > 0 ? [...origins] : undefined;
}

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Monzi — AI Multi-Agent Assistant",
  description:
    "Create AI agents, connect your apps, and get a 360° dashboard view of your digital ecosystem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider allowedRedirectOrigins={getAllowedRedirectOrigins()}>
      <html
        lang="en"
        className={`${sora.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
