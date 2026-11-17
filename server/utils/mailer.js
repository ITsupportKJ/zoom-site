require("dotenv").config();
const nodemailer = require("nodemailer");

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  NOTIFY_EMAIL,
  SHOP_CURRENCY,
  ADMIN_URL,
} = process.env;

const enabled = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && NOTIFY_EMAIL);

const transporter = enabled
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: SMTP_SECURE === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })
  : null;

const currency = SHOP_CURRENCY || "";
const money = (n) =>
  `${currency}${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

// Customer text goes into an HTML email, so it must be escaped
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const oneLine = (s) =>
  String(s ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim();
const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");

function isEmailConfigured() {
  return enabled;
}

/**
 * inquiry = { id, customer_name, phone, email, message,
 *             items: [{ frame_name, size_label, quantity, price }] }
 */
async function sendInquiryEmail(inquiry) {
  if (!enabled) return;

  const items = inquiry.items || [];
  const total = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  const rowsHtml = items
    .map(
      (i) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(i.frame_name)} (${esc(i.size_label)})</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${money(i.price)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${money(Number(i.price) * i.quantity)}</td>
      </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;color:#222">
      <h2 style="margin:0 0 12px">New inquiry #${inquiry.id}</h2>
      <p style="margin:4px 0"><strong>Name:</strong> ${esc(inquiry.customer_name)}</p>
      <p style="margin:4px 0"><strong>Phone:</strong> ${esc(inquiry.phone) || "-"}</p>
      <p style="margin:4px 0"><strong>Email:</strong> ${esc(inquiry.email) || "-"}</p>
      ${
        inquiry.message
          ? `<p style="margin:12px 0 4px"><strong>Message:</strong></p>
             <p style="margin:0;padding:10px;background:#f6f2ed;border-radius:6px;white-space:pre-wrap">${esc(inquiry.message)}</p>`
          : ""
      }
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
        <thead>
          <tr style="background:#f6f2ed">
            <th style="padding:6px 10px;text-align:left">Frame</th>
            <th style="padding:6px 10px">Qty</th>
            <th style="padding:6px 10px;text-align:right">Price</th>
            <th style="padding:6px 10px;text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <p style="text-align:right;font-size:16px"><strong>Estimated total: ${money(total)}</strong></p>
      ${ADMIN_URL ? `<p><a href="${esc(ADMIN_URL)}">Open the admin panel</a></p>` : ""}
    </div>`;

  const text = [
    `New inquiry #${inquiry.id}`,
    `Name: ${oneLine(inquiry.customer_name)}`,
    `Phone: ${inquiry.phone || "-"}`,
    `Email: ${inquiry.email || "-"}`,
    inquiry.message ? `Message: ${inquiry.message}` : "",
    "",
    ...items.map(
      (i) =>
        `${i.quantity} x ${i.frame_name} (${i.size_label}) - ${money(i.price)} each`,
    ),
    "",
    `Estimated total: ${money(total)}`,
    ADMIN_URL ? `Admin: ${ADMIN_URL}` : "",
  ]
    .filter((line, idx, arr) => line !== "" || arr[idx - 1] !== "")
    .join("\n");

  await transporter.sendMail({
    from: MAIL_FROM || SMTP_USER,
    to: NOTIFY_EMAIL,
    // Replying to the notification writes straight to the customer
    replyTo: looksLikeEmail(inquiry.email) ? inquiry.email : undefined,
    subject: `New inquiry #${inquiry.id} from ${oneLine(inquiry.customer_name).slice(0, 60)}`,
    text,
    html,
  });
}

module.exports = { sendInquiryEmail, isEmailConfigured };
