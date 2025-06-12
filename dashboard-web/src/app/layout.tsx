import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TFC Production Dashboard',
  description: 'Real-time production monitoring and analytics',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-dashboard-header text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <img 
                  src="https://img2.pic.in.th/pic/logo14821dedd19c2ad18.png" 
                  alt="TFC Logo" 
                  className="h-12 w-auto mr-4"
                />
                <div className="text-xl font-bold">Production Dashboard</div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/" className="hover:bg-brown-800 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                  Dashboard
                </Link>
                <Link href="/realtime" className="hover:bg-brown-800 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                  Real-time Monitor
                </Link>
                <Link href="/analytics" className="hover:bg-brown-800 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                  Analytics
                </Link>
                <Link href="/downtime" className="hover:bg-brown-800 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                  Downtime Analysis
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="min-h-screen bg-dashboard-background">
          {children}
        </main>
      </body>
    </html>
  )
} 