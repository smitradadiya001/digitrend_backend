const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Allow requests from frontend (change CLIENT_ORIGIN in .env if needed)
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*",
  })
);

// Simple health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "DiGITrend contact backend running" });
});

// Create a reusable transporter object using SMTP details from environment
function createTransporter() {
  let { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP configuration missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS in your environment.");
  }

  // Fallback: Gmail user but host corrupt/wrong -> use smtp.gmail.com
  if (SMTP_USER?.includes("@gmail.com") && (!SMTP_HOST || !SMTP_HOST.includes("gmail"))) {
    SMTP_HOST = "smtp.gmail.com";
  }

  if (!SMTP_HOST) {
    throw new Error("SMTP_HOST is not set in your .env file.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body || {};

  if (!email || !message) {
    return res.status(400).json({
      success: false,
      error: "Email and message are required.",
    });
  }

  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    return res.status(500).json({
      success: false,
      error: "OWNER_EMAIL is not configured on the server.",
    });
  }

  let transporter;
  try {
    transporter = createTransporter();
  } catch (err) {
    console.error("Transporter creation error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Email configuration error on server.",
    });
  }

  // Gmail only allows sending from SMTP_USER; custom FROM_EMAIL can cause rejection
  const fromAddress =
    process.env.SMTP_USER?.includes("@gmail.com")
      ? process.env.SMTP_USER
      : (process.env.FROM_EMAIL || process.env.SMTP_USER);

  try {
    // Send both emails in parallel (faster than sequential)
    const thankYouMail = {
      from: fromAddress,
      to: email,
      subject: "Thank you for contacting DiGITrend",
      text: `Hi ${name || "there"},

Thank you for reaching out to DiGITrend. We have received your message and will get back to you as soon as possible.

Your message:
${message}

Best regards,
DiGITrend Team`,
      html: `<p>Hi ${name || "there"},</p>
<p>Thank you for reaching out to <strong>DiGITrend</strong>. We have received your message and will get back to you as soon as possible.</p>
<p><strong>Your message:</strong><br/>${(message || "").replace(/\n/g, "<br/>")}</p>
<p>Best regards,<br/>DiGITrend Team</p>`,
    };

    const ownerMail = {
      from: fromAddress,
      to: ownerEmail,
      subject: "New contact form submission - DiGITrend",
      text: `You have a new contact form submission:

Name: ${name || "N/A"}
Email: ${email}

Message:
${message}
`,
      html: `<p>You have a new contact form submission:</p>
<ul>
  <li><strong>Name:</strong> ${name || "N/A"}</li>
  <li><strong>Email:</strong> ${email}</li>
</ul>
<p><strong>Message:</strong><br/>${(message || "").replace(/\n/g, "<br/>")}</p>`,
    };

    await Promise.all([
      transporter.sendMail(thankYouMail),
      transporter.sendMail(ownerMail),
    ]);

    res.json({
      success: true,
      message: "Messages sent successfully.",
    });
  } catch (error) {
    console.error("Error sending contact emails:", error);
    // Sanitized error for client; full error in server logs
    let clientError = "Failed to send emails. Please try again later.";
    if (error.code === "ETIMEDOUT" || error.code === "ESOCKETTIMEDOUT") {
      clientError = "Request timed out. Please try again.";
    } else if (error.code === "EAUTH" || error.responseCode === 535) {
      clientError = "Email authentication failed. Check SMTP credentials in Vercel.";
    } else if (error.message?.includes("OWNER_EMAIL") || error.message?.includes("SMTP")) {
      clientError = "Server email config error. Add all env vars in Vercel.";
    }
    res.status(500).json({
      success: false,
      error: clientError,
    });
  }
});

// Only listen when run directly (local dev). On Vercel, export app for serverless.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DiGITrend contact backend listening on port ${PORT}`);
    console.log("SMTP_HOST:", process.env.SMTP_HOST || "(not set)");
  });
}

module.exports = app;

