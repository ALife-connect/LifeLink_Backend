const welcomeMail = (fullName, otp) => {
  return `
    <div style="background:#f4f7fb; padding:40px; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
        
        <div style="padding:30px; color:#333;">
          <h2 style="margin-top:0; color:#2e6da4;">Hello ${fullName.split(" ")[0]},</h2>
          <p style="font-size:15px; line-height:1.6;">
            Thank you for registering on SLODAT. Here is your code to activate your account:
          </p>

          <!-- OTP -->
          <div style="text-align:center; margin:25px 0;">
            <span style="display:inline-block; font-size:30px; font-weight:bold; 
                         letter-spacing:6px; color:#2e6da4; background:#f0f4fa; 
                         padding:12px 24px; border-radius:8px; border:2px;">
              ${otp}
            </span>
          </div>

          <p style="font-size:14px; color:#555; line-height:1.6;">
            If you did not make this request, don’t worry.  
            Your account is still safe and you can ignore this email.
          </p>
          
        <p style="margin-top:25px; font-size:14px; color:#444;">
          With care,<br/>
          <strong style="color:#2e6da4;">The SLODAT Team</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#f0f4fa; padding:15px; text-align:center; font-size:12px; color:#888;">
        © ${new Date().getFullYear()} SLODAT. All rights reserved.
     
        </div>
      </div>
    </div>
  `;
};

module.exports = welcomeMail;