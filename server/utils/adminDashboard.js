import transporter from "./email.js";
import { getEmailTemplate } from "./emailTemplate.js";

/**
 * Send a styled admin dashboard notification email.
 * @param {string} subject - Email subject
 * @param {string} title   - Title shown inside the email
 * @param {string} htmlContent - HTML body content
 */
export async function sendAdminDashboard(subject, title, htmlContent) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !process.env.EMAIL_USER) return;

  try {
    await transporter.sendMail({
      from: `"Spectra Commerce" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `[Spectra Admin] ${subject}`,
      html: getEmailTemplate(title, htmlContent),
    });
    console.log(`📧 Admin dashboard email sent: ${subject}`);
  } catch (err) {
    console.error("Failed to send admin dashboard email:", err.message);
  }
}
