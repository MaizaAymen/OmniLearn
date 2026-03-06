const nodeMailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const transport = nodeMailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user:  process.env.user, 
        pass: process.env.pass
    },
    tls: { rejectUnauthorized: false },
});

const sendEmail = async ({ to, subject, text, html }) => {
    const mailOptions = {
        from: process.env.user,
        to,
        subject,
        text,
        html
    };
    try {
        await transport.sendMail(mailOptions);
        console.log("Email sent successfully");
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

module.exports = sendEmail;