/**
 * 15. Resend Transactional Email Utility
 */
export async function sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Alex Food <orders@yourdomain.com>';

  if (!apiKey) {
    console.log(`[EMAIL-MOCK] Resend not configured. Simulated email to ${to}: "${subject}"`);
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html: htmlContent,
      }),
    });

    if (response.ok) {
      console.log(`[Resend Email] Successfully sent email to ${to}`);
      return true;
    } else {
      const errData = await response.json();
      console.error('[Resend Error]', errData);
      return false;
    }
  } catch (err) {
    console.error('[Resend Exception]', err);
    return false;
  }
}
