import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'UnifyLine — AI Receptionist for Small Business',
  description: 'An AI receptionist that answers every call 24/7 and sends you every lead. Team softphone extensions, call summaries, and a daily Morning Briefing.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{colorScheme:'light'}}>
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body className={inter.className} style={{backgroundColor:'#ffffff',colorScheme:'light'}}>{children}</body>
    </html>
  )
}
