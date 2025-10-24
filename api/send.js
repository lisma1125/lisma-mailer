import nodemailer from "nodemailer";

// Simple CORS + method handling
function sendCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Auth");
}

export default async function handler(req, res) {
  sendCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  // Optional shared secret to prevent abuse
  const expected = process.env.MAILER_TOKEN || "";
  const provided = req.headers["x-auth"] ?? "";
  if (expected && provided !== expected) return res.status(401).send("Unauthorized");

  const {
    robot_serial = "",
    robot_name = "",
    address = "",
    status = "",
    timestamp = ""
  } = req.body || {};

  if (!status || (!robot_name && !robot_serial)) {
    return res.status(400).send("Missing fields");
  }

  // Gmail SMTP via app password (works in Vercel)
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,           // e.g. office@lismafoundation.org or alerts account
      pass: process.env.GMAIL_APP_PASSWORD    // 16-char Gmail App Password
    }
  });

  const toList = (process.env.MAIL_TO || "office@lismafoundation.org")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const subject = `🚨 Emergency Alert from ${robot_name || robot_serial}`;
  const text = `🚨 EMERGENCY ALERT 🚨

Robot: ${robot_name || robot_serial}
Location: ${address}
Status: ${status}
Time: ${timestamp}
`;

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: toList,
      subject,
      text
    });
    return res.status(200).send("OK");
  } catch (err) {
    console.error("Mailer error:", err);
    return res.status(500).send("Email failed");
  }
}
