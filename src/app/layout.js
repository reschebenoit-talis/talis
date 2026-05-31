export const metadata = {
  title: 'Talis — Benoit Resche',
  description: 'Plateforme pédagogique Talis Business School',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
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
    <html lang="fr" style={{height:'100%',overflow:'hidden'}}>
      <head>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="theme-color" content="#0A0A0F"/>
      </head>
      <body style={{margin:0,padding:0,height:'100%',overflow:'hidden',background:'#0A0A0F'}}>{children}</body>
    </html>
  )
}
