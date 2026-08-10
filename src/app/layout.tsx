import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Geist, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "MyData Education",
  description: "Institutes, classes, and assignments",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const embedded =
    headerStore.get("x-edu-embed") === "1" || cookieStore.get("edu-embed")?.value === "1";

  return (
    <html
      lang="en"
      className={`${geist.variable} ${sourceSerif.variable} antialiased`}
      data-embed={embedded ? "1" : undefined}
    >
      <body className={embedded ? "embed-mode" : "min-h-full"}>{children}</body>
    </html>
  );
}
