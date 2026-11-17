require("dotenv").config();
const { sendInquiryEmail, isEmailConfigured } = require("../utils/mailer");

(async () => {
  if (!isEmailConfigured()) {
    console.log(
      "Email is not configured. Check SMTP_HOST, SMTP_USER, SMTP_PASS and NOTIFY_EMAIL in .env",
    );
    process.exit(1);
  }
  try {
    await sendInquiryEmail({
      id: 0,
      customer_name: "Test Customer",
      phone: "+1 555 000 0000",
      email: "",
      message: "This is a test message.",
      items: [
        {
          frame_name: "Classic Oak",
          size_label: "8x10",
          quantity: 2,
          price: 2500,
        },
      ],
    });
    console.log("Test email sent to", process.env.NOTIFY_EMAIL);
  } catch (err) {
    console.log("Sending failed:", err.message);
  }
  process.exit(0);
})();
