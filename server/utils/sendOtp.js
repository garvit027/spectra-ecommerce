import transporter from "./email.js";
import { getEmailTemplate } from "./emailTemplate.js";

export async function sendOtp(email, otp) {
  const content = `
    <p>We received a request to verify your email address. Your OTP code is below:</p>
    <div class="otp-box">${otp}</div>
    <p>This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
  `;

  await transporter.sendMail({
    from: `"Spectra Commerce" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your OTP Code",
    html: getEmailTemplate("Verify Your Email", content)
  });
}