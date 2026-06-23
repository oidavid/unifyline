import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'UnifyLine — AI Communications Platform for Global Business',
  description: 'One platform for calls, AI receptionists, team softphones, and business intelligence — from Atlanta to Lagos to London. Enterprise communications at human pricing.',
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
