export const metadata = {
  title: 'Talis — Benoit Resche',
  description: 'Plateforme pédagogique',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
