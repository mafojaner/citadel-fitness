// Citadel Fitness — weekly digest body
//
// Split from the sending function for the same reason welcome-email-content
// is: the wording is the part most likely to be revised, and it shouldn't
// require touching auth, batching or Resend handling to change a sentence.

import { emailButton } from './email-template.ts';

export interface DigestStats {
  name: string | null;
  weightUnit: string;
  daysLogged: number;
  totalSets: number;
  totalVolumeKg: number;
  topCategory: string | null;
}

const KG_PER_LB = 2.2046226218;

/**
 * What to aim at next week, chosen from the week just finished.
 *
 * Deliberately simple and legible rather than clever: three days is the
 * threshold the weekly reward already uses (four), so this nudges toward it
 * rather than inventing a second, competing definition of a good week.
 */
function focusFor(stats: DigestStats): string {
  if (stats.daysLogged >= 4) {
    return 'You hit the four-day mark. Hold it — consistency at this level is what moves the numbers.';
  }
  if (stats.daysLogged === 3) {
    return 'One more session next week takes you to four, which is where the weekly reward starts counting.';
  }
  if (stats.topCategory) {
    return `Most of your work went into ${stats.topCategory}. Adding a second and third day next week is the easiest gain available.`;
  }
  return 'Two sessions next week would double this one. Pick the days now rather than deciding each morning.';
}

export function weeklyDigestBody(stats: DigestStats): string {
  const greeting = stats.name ? `Hi ${stats.name},` : 'Hi,';
  const volume =
    stats.weightUnit === 'lb'
      ? Math.round(stats.totalVolumeKg * KG_PER_LB)
      : Math.round(stats.totalVolumeKg);

  const dayWord = stats.daysLogged === 1 ? 'day' : 'days';
  const setWord = stats.totalSets === 1 ? 'set' : 'sets';

  return `
    <p style="margin:0 0 18px;font-size:17px;font-weight:700;">${greeting}</p>
    <p style="margin:0 0 24px;">Here's how your week went.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:14px 16px;background-color:#F5F6F8;border-radius:12px;">
          <span style="display:block;font-size:26px;font-weight:800;color:#0B0E14;">${stats.daysLogged}</span>
          <span style="font-size:13px;color:#4A5468;">${dayWord} trained</span>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:14px 16px;background-color:#F5F6F8;border-radius:12px;">
          <span style="display:block;font-size:26px;font-weight:800;color:#0B0E14;">${stats.totalSets}</span>
          <span style="font-size:13px;color:#4A5468;">${setWord} logged</span>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:14px 16px;background-color:#F5F6F8;border-radius:12px;">
          <span style="display:block;font-size:26px;font-weight:800;color:#0B0E14;">${volume.toLocaleString()} ${stats.weightUnit}</span>
          <span style="font-size:13px;color:#4A5468;">total volume moved</span>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;color:#FF5A36;">NEXT WEEK</p>
    <p style="margin:0 0 4px;">${focusFor(stats)}</p>

    ${emailButton('https://citadelfitness.app', 'Open Citadel Fitness')}

    <p style="margin:24px 0 0;font-size:12px;color:#8A93A6;">
      You're getting this because the weekly digest is switched on for your Fortress
      account. Turn it off any time in Account &rarr; Notifications.
    </p>
  `;
}
