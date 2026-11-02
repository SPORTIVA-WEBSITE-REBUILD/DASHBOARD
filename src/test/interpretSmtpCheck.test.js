import { describe, it, expect } from 'vitest';
import { interpretSmtpCheck } from '../lib/interpretSmtpCheck.js';

const base = {
  tcp: [{ port: 465, reachable: true, ms: 100 }, { port: 587, reachable: true, ms: 100 }],
  verify: { ok: true, code: null },
  config: {
    namesPresent: {
      SMTP_HOST: true, SMTP_PORT: true, SMTP_SECURE: true, SMTP_USER: true, SMTP_PASS: true,
      MAIL_FROM_NAME: true, MAIL_FROM_ADDRESS: true, MAIL_REPLY_TO: true, EMAIL_DRY_RUN: false,
    },
    required: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'],
    missingRequired: [],
    host: 'smtp.example.com', port: 465, secure: true, user: 'x@example.com', fromAddress: 'x@example.com',
  },
};

describe('interpretSmtpCheck', () => {
  it('reports success cleanly when login is accepted', () => {
    const { conclusion, fix } = interpretSmtpCheck(base);
    expect(conclusion).toMatch(/working/i);
    expect(fix).toMatch(/no change/i);
  });

  it('lists missing variable NAMES when required settings are absent', () => {
    const r = interpretSmtpCheck({
      ...base,
      verify: { ok: false, code: 'MISSING_HOST_OR_CREDENTIALS' },
      config: { ...base.config, missingRequired: ['SMTP_HOST', 'SMTP_PASS'] },
    });
    expect(r.fix).toContain('SMTP_HOST');
    expect(r.fix).toContain('SMTP_PASS');
  });

  it('EMAIL_DRY_RUN and SMTP_SECURE being absent never counts as "missing" — only missingRequired does', () => {
    const r = interpretSmtpCheck({
      ...base,
      config: { ...base.config, namesPresent: { ...base.config.namesPresent, SMTP_SECURE: false, EMAIL_DRY_RUN: false }, missingRequired: [] },
    });
    expect(r.conclusion).not.toMatch(/missing/i);
  });

  it('EAUTH: tells the admin to check SMTP access / regenerate an app password, without ever naming a password value', () => {
    const r = interpretSmtpCheck({
      ...base,
      verify: { ok: false, code: 'EAUTH', smtpResponseCode: 535 },
    });
    expect(r.conclusion).toContain('535');
    expect(r.fix).toMatch(/app-specific password/i);
    expect(r.fix).not.toMatch(/correct-horse|hunter2|password123/i); // never a literal guessed password
  });

  it('465 unreachable, 587 reachable: tells the admin to switch to 587/not-secure', () => {
    const r = interpretSmtpCheck({
      ...base,
      tcp: [{ port: 465, reachable: false, code: 'ETIMEDOUT', ms: 15000 }, { port: 587, reachable: true, ms: 200 }],
      verify: { ok: false, code: 'ETIMEDOUT' },
    });
    expect(r.fix).toContain('SMTP_PORT to 587');
    expect(r.fix).toContain('SMTP_SECURE to false');
  });

  it('587 unreachable, 465 reachable, but configured for 587: tells the admin to switch to 465/secure', () => {
    const r = interpretSmtpCheck({
      ...base,
      tcp: [{ port: 465, reachable: true, ms: 200 }, { port: 587, reachable: false, code: 'ETIMEDOUT', ms: 15000 }],
      verify: { ok: false, code: 'ETIMEDOUT' },
      config: { ...base.config, port: 587 },
    });
    expect(r.fix).toContain('SMTP_PORT to 465');
    expect(r.fix).toContain('SMTP_SECURE to true');
  });

  it('both ports unreachable: diagnoses a network block and names SES/Resend/Postmark with the SAME variable names', () => {
    const r = interpretSmtpCheck({
      ...base,
      tcp: [{ port: 465, reachable: false, code: 'ETIMEDOUT', ms: 15000 }, { port: 587, reachable: false, code: 'ETIMEDOUT', ms: 15000 }],
      verify: { ok: false, code: 'ETIMEDOUT' },
    });
    expect(r.conclusion).toMatch(/network block/i);
    expect(r.fix).toMatch(/SES|Resend|Postmark/);
    expect(r.fix).toContain('SMTP_HOST');
    expect(r.fix).toContain('SMTP_PASS');
  });
});
