// Citadel Fitness — weekly digest body
//
// Split from the sending function for the same reason welcome-email-content
// is: the wording is the part most likely to be revised, and it shouldn't
// require touching auth, batching or Resend handling to change a sentence.

import { emailButton } from './email-template.ts';

export interface FortressSummary {
  program: {
    programName: string;
    dayName: string;
    position: number;
    cycleLength: number;
  } | null;
  goal: {
    exerciseName: string;
    target: number;
    unit: string;
    targetDate: string;
    daysLeft: number;
    current: number;
  } | null;
  newRecords: number;
  group: { groupName: string; rank: number; memberCount: number } | null;
}

export interface DigestStats {
  name: string | null;
  weightUnit: string;
  daysLogged: number;
  totalSets: number;
  totalVolumeKg: number;
  topCategory: string | null;
  /**
   * The Fortress half of the week. Null for a member with none of it set
   * up, in which case the digest is what it always was.
   */
  fortress?: FortressSummary | null;
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

/**
 * Ordinal, so a group line reads as a placing rather than a count. Matches
 * the Home card, which is the point: the email and the app should describe
 * the same week in the same words.
 */
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function row(label: string, value: string): string {
  return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #2A3140;">
          <span style="display:block;font-size:15px;font-weight:700;color:#F5F6F8;">${value}</span>
          <span style="font-size:12px;color:#A8B2C4;">${label}</span>
        </td>
      </tr>`;
}

/**
 * The half of the email that justifies the tier.
 *
 * The digest used to report days trained, sets logged and total volume --
 * every one of which the free Activity screen already shows. A paying member
 * got an email that proved nothing about what they pay for, and this is the
 * only contact the app makes between sessions.
 *
 * Rendered as a dark panel, matching the inverse slab the app uses for
 * Fortress surfaces. Returns nothing at all when the member has no program,
 * no goal, no records and no group -- an empty "your Fortress week" heading
 * would be a worse advert for the tier than leaving it out.
 */
function fortressBlock(fortress: FortressSummary | null | undefined): string {
  if (!fortress) return '';

  const rows: string[] = [];

  if (fortress.newRecords > 0) {
    rows.push(
      row(
        'Set in the last seven days',
        fortress.newRecords === 1
          ? 'A new personal record'
          : `${fortress.newRecords} new personal records`
      )
    );
  }

  if (fortress.program) {
    const p = fortress.program;
    rows.push(row(`Day ${p.position} of ${p.cycleLength} · ${p.programName}`, `Next up: ${p.dayName}`));
  }

  if (fortress.goal) {
    const g = fortress.goal;
    const remaining = Math.max(0, Math.round((g.target - g.current) * 10) / 10);
    rows.push(
      row(
        remaining === 0
          ? `Target of ${g.target} ${g.unit} reached`
          : `${remaining} ${g.unit} to go · ${g.daysLeft} day${g.daysLeft === 1 ? '' : 's'} left`,
        g.exerciseName
      )
    );
  }

  if (fortress.group && fortress.group.memberCount > 1) {
    // Suppressed in a group of one, exactly as on the Home card: "1st of 1"
    // is not a standing.
    const gr = fortress.group;
    rows.push(row(`${gr.groupName} · this week`, `${ordinal(gr.rank)} of ${gr.memberCount}`));
  }

  if (rows.length === 0) return '';

  return `
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;color:#FF5A36;">YOUR FORTRESS WEEK</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#1C2230;border-radius:12px;">
      ${rows.join('')}
    </table>
  `;
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

    ${fortressBlock(stats.fortress)}

    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;color:#8A93A6;">THE NUMBERS</p>
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
