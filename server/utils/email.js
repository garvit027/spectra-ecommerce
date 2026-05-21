import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

transporter.verify((err) => {
  if (err) console.error("❌ Email transporter verify failed:", err);
  else console.log("✅ Email transporter ready");
});

export default transporter;
