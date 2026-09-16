import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Attendance",
  description: "Class attendance tracking for teachers",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
