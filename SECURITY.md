# Security Policy

## Reporting a vulnerability

If you believe you have found a security issue in the PCN Sportiva LP admin
dashboard, please report it privately by email to **contact@pcnsportivalp.com** with
the subject line "Security report".

Please do not open a public GitHub issue or post details elsewhere before we have
had a chance to fix the problem.

Helpful details to include:

- What you found and where in the dashboard it happens.
- Steps to reproduce it, or a short proof of concept.
- What you think the impact is.
- Your name or handle if you would like credit.

We aim to acknowledge a report within 5 working days and to keep you updated until
it is resolved. We will not take legal action against anyone who reports an issue
in good faith, avoids accessing other people's data, and does not disrupt the
service.

## Scope

This repository is the content-management dashboard (React, hosted on Netlify) at
admin.pcnsportivalp.com, used by staff to manage the website, webinar settings and
registrations.

In scope: sign-in and session handling, access control between roles, the editor and
upload features, and anything that could expose registrant or enquiry data.

Out of scope: denial-of-service by sheer traffic volume, social engineering of staff,
and issues in third-party services (Netlify, Cloudinary) that should be reported to
those providers directly. The API and public website have their own repositories and
policies.

## What is in place

- A Content-Security-Policy that only allows scripts from the dashboard itself,
  and blocks framing, plugins and form posts to other sites.
- `X-Frame-Options: DENY`, a same-origin referrer policy, and `noindex` so the
  dashboard is never indexed.
- HTTPS only, with HSTS.
- All data requests go through the API, which requires a login and enforces roles.
- Dependencies are checked with `npm audit`.
