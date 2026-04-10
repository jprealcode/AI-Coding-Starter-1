import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hausverwaltung — Rechnungsworkflow',
  description: 'Digitaler Eingangsrechnungs-Workflow für professionelle Hausverwaltungen',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  )
}
