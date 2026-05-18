const nodeMailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const transport = nodeMailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
});

// GitHub-style contribution palette + GitHub Primer-ish neutrals.
const BRAND = {
    name: "OmniLearn",
    primary: "#2da44e",     // GitHub button green
    primaryDark: "#2c974b",
    bg: "#f6f8fa",
    card: "#ffffff",
    text: "#1f2328",
    muted: "#57606a",
    border: "#d0d7de",
};

// 5-level contribution heatmap (empty → max).
const HEAT = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

const clientUrl = () => process.env.CLIENT_URL || "http://localhost:3000";

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

// Build a decorative contribution-heatmap grid as an HTML <table> (email-safe).
// Rows = days of week (Sun..Sat); cols = weeks. Each cell is a small colored square.
//
// mode:
//   "active" (default) — mixed organic heatmap (returning users).
//   "new"              — empty grid with just "today" lit up, for first-time users.
const renderContributionGrid = ({ rows = 7, cols = 36, mode = "active" } = {}) => {
    const weights = [0.55, 0.20, 0.13, 0.08, 0.04]; // chance per heat level
    const pick = () => {
        if (mode === "new") return 0; // start empty for new users
        const r = Math.random();
        let acc = 0;
        for (let i = 0; i < weights.length; i++) {
            acc += weights[i];
            if (r < acc) return i;
        }
        return 0;
    };

    // For "new" mode: pick a single "today" cell (last column, a weekday) to light up.
    const todayCol = cols - 1;
    const todayRow = new Date().getDay(); // 0..6 (Sun..Sat)

    const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];
    const monthLabels = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];

    // Month-label row: spread labels across columns by colspan.
    // 36 cols / 12 months = 3 cols per month label.
    const monthsPerLabel = Math.floor(cols / monthLabels.length);
    let monthRow = `<tr><td style="width:28px;"></td>`;
    monthLabels.forEach((m) => {
        monthRow += `<td colspan="${monthsPerLabel}" style="font:600 10px/1 ${FONT};color:${BRAND.muted};text-align:left;padding:0 0 6px 0;letter-spacing:0.2px;">${m}</td>`;
    });
    // Pad any remaining columns (in case cols isn't divisible by 12).
    const remainder = cols - monthsPerLabel * monthLabels.length;
    if (remainder > 0) monthRow += `<td colspan="${remainder}"></td>`;
    monthRow += `</tr>`;

    // Day rows.
    let dayRows = "";
    for (let r = 0; r < rows; r++) {
        let row = `<tr>`;
        row += `<td style="width:28px;font:600 10px/1 ${FONT};color:${BRAND.muted};text-align:right;padding-right:6px;vertical-align:middle;">${dayLabels[r] || ""}</td>`;
        for (let c = 0; c < cols; c++) {
            const isToday = mode === "new" && r === todayRow && c === todayCol;
            if (isToday) {
                // Highlighted "today" cell: brightest green, slightly larger with a light-green halo.
                row += `<td style="padding:0;width:11px;height:11px;font-size:0;line-height:0;vertical-align:middle;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="width:15px;height:15px;background:${HEAT[4]};border-radius:3px;border:2px solid ${HEAT[1]};font-size:0;line-height:0;">&nbsp;</td></tr></table>
                </td>`;
            } else {
                const level = pick();
                row += `<td style="width:11px;height:11px;background:${HEAT[level]};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>`;
            }
        }
        row += `</tr>`;
        dayRows += row;
        // Tiny spacer row so cells don't touch vertically without relying on cellspacing.
        if (r < rows - 1) dayRows += `<tr><td colspan="${cols + 1}" style="height:2px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
    }

    // Legend row matching the GitHub graph: "Learn how we count contributions" (left) + "Less ▢▢▢▢▢ More" (right).
    let legend = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
        <tr>
          <td align="left" style="font:600 11px/1 ${FONT};color:${BRAND.muted};">
            <a href="${clientUrl()}" style="color:${BRAND.muted};text-decoration:none;">Learn how we count contributions</a>
          </td>
          <td align="right">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font:600 11px/1 ${FONT};color:${BRAND.muted};padding-right:6px;">Less</td>
                ${HEAT.map(h => `<td style="width:11px;height:11px;background:${h};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td><td style="width:3px;"></td>`).join("")}
                <td style="font:600 11px/1 ${FONT};color:${BRAND.muted};padding-left:3px;">More</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;

    return `
    <table role="presentation" cellpadding="0" cellspacing="2" border="0" style="border-collapse:separate;margin:0 auto;">
      ${monthRow}
      ${dayRows}
    </table>
    ${legend}
    `;
};

/**
 * Build a branded HTML email styled like a GitHub contribution graph.
 * Signature unchanged so existing call sites keep working.
 */
const buildEmailTemplate = ({ preheader = "", title, intro, body, cta, note, footerNote, gridMode = "active", gridCaption = "" }) => {
    const year = new Date().getFullYear();

    const ctaBlock = cta
        ? `
        <tr>
          <td align="center" style="padding:8px 0 20px 0;">
            <a href="${cta.url}"
               style="background:${BRAND.primary};color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;display:inline-block;font:600 14px/1.2 ${FONT};letter-spacing:0.2px;border:1px solid rgba(31,35,40,0.15);box-shadow:0 1px 0 rgba(31,35,40,0.04), inset 0 -1px 0 rgba(31,35,40,0.12);">
              ${cta.label}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 8px 0;color:${BRAND.muted};font:13px/1.6 ${FONT};word-break:break-all;">
            Or paste this link in your browser:<br>
            <a href="${cta.url}" style="color:${BRAND.primary};text-decoration:none;">${cta.url}</a>
          </td>
        </tr>`
        : "";

    const noteBlock = note
        ? `<tr><td style="padding:8px 0 0 0;color:${BRAND.muted};font:13px/1.6 ${FONT};">${note}</td></tr>`
        : "";

    const footerNoteBlock = footerNote
        ? `<tr><td style="padding:16px 0 0 0;color:${BRAND.muted};font:12px/1.6 ${FONT};border-top:1px solid ${BRAND.border};">${footerNote}</td></tr>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:${FONT};color:${BRAND.text};">
  <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BRAND.card};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};box-shadow:0 1px 0 rgba(31,35,40,0.04);">

          <!-- Header -->
          <tr>
            <td style="padding:18px 24px;border-bottom:1px solid ${BRAND.border};background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <span style="display:inline-block;width:28px;height:28px;background:${BRAND.primary};border-radius:6px;color:#ffffff;font:700 15px/28px ${FONT};text-align:center;vertical-align:middle;">O</span>
                    <span style="color:${BRAND.text};font:600 16px/1 ${FONT};margin-left:10px;vertical-align:middle;letter-spacing:-0.2px;">${BRAND.name}</span>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;padding:4px 10px;border:1px solid ${BRAND.border};border-radius:999px;color:${BRAND.muted};font:600 11px/1 ${FONT};background:#f6f8fa;">
                      <span style="display:inline-block;width:8px;height:8px;background:${HEAT[3]};border-radius:2px;vertical-align:middle;margin-right:6px;"></span>
                      Learning streak
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contribution-grid hero -->
          <tr>
            <td style="padding:24px 24px 8px 24px;background:#ffffff;">
              ${renderContributionGrid({ rows: 7, cols: 36, mode: gridMode })}
              ${gridCaption ? `<p style="margin:14px 0 0 0;text-align:center;color:${BRAND.muted};font:600 12px/1.4 ${FONT};letter-spacing:0.2px;">${gridCaption}</p>` : ""}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:8px 32px 32px 32px;background:#ffffff;">
              <h1 style="margin:8px 0 6px 0;font:700 22px/1.3 ${FONT};color:${BRAND.text};letter-spacing:-0.3px;">${title}</h1>
              <p style="margin:0 0 18px 0;color:${BRAND.muted};font:15px/1.5 ${FONT};">${intro}</p>
              <div style="color:${BRAND.text};font:15px/1.65 ${FONT};">
                ${body}
              </div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
                ${ctaBlock}
                ${noteBlock}
                ${footerNoteBlock}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f6f8fa;padding:18px 32px;border-top:1px solid ${BRAND.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="color:${BRAND.muted};font:12px/1.6 ${FONT};">
                    <strong style="color:${BRAND.text};">${BRAND.name}</strong> · Learn together. Grow together.<br>
                    &copy; ${year} ${BRAND.name}. All rights reserved.
                  </td>
                  <td align="right" style="vertical-align:bottom;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font:600 10px/1 ${FONT};color:${BRAND.muted};padding-right:6px;">Less</td>
                        ${HEAT.map(h => `<td style="width:10px;height:10px;background:${h};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td><td style="width:3px;"></td>`).join("")}
                        <td style="font:600 10px/1 ${FONT};color:${BRAND.muted};padding-left:3px;">More</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
</td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const sendEmail = async ({ to, subject, text, html }) => {
    const mailOptions = {
        from: `"OmniLearn" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html
    };
    try {
        await transport.sendMail(mailOptions);
        console.log("Email sent successfully");
    } catch (error) {
        console.error("Error sending email:", error);
    }
};


module.exports = sendEmail;
module.exports.buildEmailTemplate = buildEmailTemplate;
module.exports.clientUrl = clientUrl;


module.exports = sendEmail;orts = sendEmail;