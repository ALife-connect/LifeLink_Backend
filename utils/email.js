const nodeMailer = require('nodemailer'); 
require('dotenv').config()

const sendMail = async ( options ) => {
    console.log("attempting to send mail");
    
    const transporter = await nodeMailer.createTransport({
        service : "gmail",
        secure: true,
        auth: {
            user: process.env.userEmail,
            pass: process.env.passEmail
        },
        tls:{
            //Bypass SSL verification
            rejectUnauthorized:false,
        }
    });
    const mailOption = {
        subject: options.subject, text:options.text, from:`"LifeLink"<${process.env.userEmail}>`, to:options.email, html:options.html
    };
    await transporter.sendMail(mailOption)
}
module.exports = sendMail;  