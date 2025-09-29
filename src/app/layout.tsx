import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Auto Car Background',
  description: 'An application that allows users to upload a car photo, provide a background description or a reference image, and uses AI to replace the background while keeping the car in the foreground.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900">{children}</body>
    </html>
  )
}