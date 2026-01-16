const { transporter } = require("../lib/mailer");
const { isValidEmail, normalizeEmail } = require("../utils/text");

const subscribeNewsletter = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Roots Maghreb Newsletter",
      text: `Thanks for joining Roots Maghreb. We will reach out to you soon at ${email}.`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #2c1810;">
          <h2 style="color:#5d4037;">Welcome to Roots Maghreb</h2>
          <p>Thanks for joining our newsletter.</p>
          <p>We will reach out to you soon at <strong>${email}</strong>.</p>
          <p style="margin-top:20px;">- Roots Maghreb</p>
        </div>
      `,
    });

    res.json({ message: "Subscribed" });
  } catch (err) {
    console.error("Newsletter error:", err.message);
    res.status(500).json({ message: "Failed to subscribe" });
  }
};

module.exports = { subscribeNewsletter };
