// Citadel Fitness — shared HTML email shell
//
// One branded wrapper used by every outbound Resend email, so a visual
// change here is a visual change everywhere at once instead of three
// copies drifting apart. Table-based layout with inline styles only —
// email clients (Outlook especially) don't reliably support flexbox,
// external stylesheets, or CSS gradients on <button>, so this deliberately
// stays plainer than the app/landing page's own CSS.

const LOGO_URL = 'https://citadelfitness.app/og-image.png';

export function emailShell(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#F0F1F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F1F4;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;text-align:center;background-color:#0B0E14;">
                <img src="${LOGO_URL}" width="48" height="48" alt="Citadel Fitness" style="border-radius:12px;display:block;margin:0 auto 10px;" />
                <span style="color:#FFFFFF;font-size:13px;font-weight:700;letter-spacing:0.14em;">CITADEL</span>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 32px;color:#0B0E14;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;border-top:1px solid #EEEEEE;text-align:center;">
                <span style="color:#8A93A6;font-size:12px;">&copy; 2026 Citadel Fitness</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function emailButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td style="border-radius:999px;background-color:#FF5A36;">
        <a href="${url}" style="display:inline-block;padding:14px 28px;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;border-radius:999px;">${label}</a>
      </td>
    </tr>
  </table>`;
}
