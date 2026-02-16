import './globals.css'

export const metadata = {
  title: 'Claude Chat',
  description: 'AI Chat with Claude',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
