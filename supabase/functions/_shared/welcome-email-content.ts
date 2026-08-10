// Citadel Fitness — welcome email body content
//
// Shared between send-welcome-email (fires on first confirmation) and
// backfill-welcome-emails (one-off catch-up for users who signed up
// before this worked), so the copy only ever lives in one place instead
// of two copies drifting apart.

import { emailButton } from './email-template.ts';

export function welcomeEmailBody(name: string): string {
  return `
    <p style="margin:0 0 4px;font-size:20px;font-weight:700;">Welcome, ${name}.</p>
    <p style="margin:0 0 20px;color:#4A5468;">Your account's confirmed, you're ready to log your first workout.</p>
    <p style="margin:0;color:#4A5468;">Open the app, tap <strong style="color:#0B0E14;">Log workout</strong>, and pick your first exercise from the catalogue. Everything you log builds your streak on the Activity tab.</p>
    ${emailButton('https://demo.citadelfitness.app', 'Open Citadel Fitness')}
    <p style="margin:0;color:#8A93A6;font-size:13px;">Strength, systemized.</p>
  `;
}
