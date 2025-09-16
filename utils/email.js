require("dotenv").config();
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendMail = async (options) => {
  try {
    console.log("Attempting to send email...");

    const msg = {
      to: options.email,
      from: `"LifeLink"<${process.env.userEmail}>`,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    await sgMail.send(msg);
    console.log(" Email sent successfully");
  } catch (error) {
    console.error(" Error sending email:", error.response?.body || error.message);
    throw new Error("Email sending failed");
  }
};

module.exports = sendMail;