import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GMAIL_USER   = process.env.GMAIL_USER;
const GMAIL_PASS   = process.env.GMAIL_PASS;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: GMAIL_USER, pass: GMAIL_PASS },
});

async function startListener() {
  console.log("👂 Listening for new emergencies...");

  supabase
    .channel("emergencies-mailer")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "emergencies" },
      async (payload) => {
        const e = payload.new;
        console.log("🚨 New emergency:", e);

        const mail = {
          from: GMAIL_USER,
          to: "office@lismafoundation.org",
          subject: `🚨 Emergency Alert from ${e.robot_name}`,
          text: `
🚨 EMERGENCY ALERT 🚨

Robot: ${e.robot_name}
Location: ${e.address}
Status: ${e.status}
Time: ${e.timestamp}
`,
        };

        try {
          await transporter.sendMail(mail);
          console.log("📧 Email sent successfully");
        } catch (err) {
          console.error("❌ Email send failed:", err);
        }
      }
    )
    .subscribe((status) => console.log("Realtime:", status));
}

startListener();
