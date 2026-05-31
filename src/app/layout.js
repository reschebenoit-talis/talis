export const metadata = {
  title: 'Talis — Benoit Resche',
  description: 'Plateforme pédagogique Talis Business School',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="Talis"/>
        <meta name="theme-color" content="#0A0A0F"/>
        <link rel="apple-touch-icon" href="/logo.jpg"/>
      </head>
      <body style={{margin:0,padding:0,overflow:'hidden',background:'#0A0A0F'}}>{children}</body>
    </html>
  )
}
