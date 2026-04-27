export const metadata = {
  title: '100 Envelope Challenge',
  description: 'Track your 100 envelope savings challenge',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
