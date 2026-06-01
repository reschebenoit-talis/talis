// API Route: POST /api/send-email
// Envoie un email via Resend

export async function POST(request) {
  try {
    const { to, subject, html } = await request.json()
    if (!to || !subject || !html) {
      return Response.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Talis <noreply@talis-school.fr>',  // ← remplacez par votre domaine vérifié sur Resend
        to: [to],
        subject,
        html,
      }),
    })

    const data = await res.json()
    if (!res.ok) return Response.json({ error: data }, { status: 500 })
    return Response.json({ success: true, id: data.id })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
