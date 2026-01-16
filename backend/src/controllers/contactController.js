const { transporter } = require("../lib/mailer");

const contact = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.SMTP_USER,
      replyTo: email,
      subject: `New Contact Message from ${name}`,
      text: `
        Name: ${name}
        Email: ${email}
        Message:
        ${message}
      `,
      html: `
        <h3>New Contact Message</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="background:#f9f9f9; padding:10px; border-left:4px solid #ccc;">
          ${message.replace(/\n/g, "<br>")}
        </blockquote>
      `,
    });

    res.json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Contact form error:", err.message);
    res.status(500).json({ message: "Failed to send message" });
  }
};

module.exports = { contact };
