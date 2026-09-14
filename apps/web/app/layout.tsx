import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from "next/font/google"
import type { Metadata } from "next"

import "@workspace/ui/globals.css"
import { brand } from "@workspace/ui/brand"
import { Providers } from "@/components/providers"
import { Toaster } from "@workspace/ui/components/sonner";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: `${brand.name} customer support dashboard`,
  icons: { icon: brand.logo },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
        style={{
          "--primary": brand.colors.primary,
          "--ring": brand.colors.primary,
          "--sidebar-primary": brand.colors.primary,
          "--sidebar-ring": brand.colors.primary,
          "--brand-gradient-to": brand.colors.gradientTo,
        } as React.CSSProperties}
      >
        <ClerkProvider
          appearance={{
            layout: { logoImageUrl: brand.logo },
            variables: { colorPrimary: brand.colors.primary },
          }}
        >
          <Providers>
            <Toaster />
            {children}
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
