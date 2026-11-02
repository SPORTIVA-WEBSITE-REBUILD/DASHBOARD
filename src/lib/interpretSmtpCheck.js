/**
 * Turns a raw POST /api/admin/webinar/smtp-check response into a plain-
 * English conclusion and an exact fix — pure and separately testable from
 * the screen that renders it. Never touches SMTP_PASS or any secret value;
 * the route itself already withholds it, this only reads what it returns.
 */
export function interpretSmtpCheck(data) {
  const missing = Object.entries(data.config.namesPresent)
    .filter(([name, present]) => !present && name !== 'EMAIL_DRY_RUN' && name !== 'SMTP_SECURE' && name !== 'MAIL_FROM_NAME' && name !== 'MAIL_REPLY_TO')
    .map(([name]) => name);

  if (missing.length > 0) {
    return {
      conclusion: 'Email settings are missing.',
      fix: `Set the following in Netlify, for this deploy context: ${missing.join(', ')}.`,
    };
  }

  const tcp465 = data.tcp.find((t) => t.port === 465);
  const tcp587 = data.tcp.find((t) => t.port === 587);

  if (data.verify.ok) {
    return {
      conclusion: 'Email is working. The connection and login both succeeded.',
      fix: 'No change needed.',
    };
  }

  if (data.verify.code === 'EAUTH') {
    return {
      conclusion: `The server is reachable, but the login was rejected (${data.verify.smtpResponseCode || 'EAUTH'}).`,
      fix: `Ask the owner of ${data.config.user || 'the mailbox'} to confirm SMTP access is enabled for it, and — if two-step verification is on — generate a fresh app-specific password and set it as SMTP_PASS. Do not guess or reuse an old one.`,
    };
  }

  if (!tcp465?.reachable && tcp587?.reachable) {
    return {
      conclusion: `Port ${data.config.port} is not reachable, but 587 is.`,
      fix: 'Set SMTP_PORT to 587 and SMTP_SECURE to false.',
    };
  }

  if (tcp465?.reachable && !tcp587?.reachable && data.config.port !== 465) {
    return {
      conclusion: 'Port 465 is reachable, but the configured port is not set to use it.',
      fix: 'Set SMTP_PORT to 465 and SMTP_SECURE to true.',
    };
  }

  if (!tcp465?.reachable && !tcp587?.reachable) {
    return {
      conclusion: 'Neither port 465 nor 587 is reachable from here. This looks like a network block, not a wrong password.',
      fix: 'Switch the mailer to Amazon SES, Resend or Postmark — each offers its own SMTP relay, so the same variable NAMES this mailer already reads (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS) work unchanged; only their values change to that provider\'s SMTP host and credentials.',
    };
  }

  return {
    conclusion: `The connection failed with ${data.verify.code || 'an unknown error'}.`,
    fix: 'Check SMTP_HOST, SMTP_PORT and SMTP_SECURE are a consistent set for the mail provider in use.',
  };
}
