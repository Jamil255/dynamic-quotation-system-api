export const generateWelcomeEmailHTML = (email, password, userName) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Welcome to Quotation System</title>
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; }
      .header { background-color: #007bff; color: #ffffff; padding: 10px; text-align: center; }
      .content { padding: 20px; }
      .credentials { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
      .button { display: inline-block; padding: 10px 20px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 5px; }
      .footer { text-align: center; padding: 10px; color: #666666; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Welcome to Quotation System</h1>
      </div>
      <div class="content">
        <p>Dear ${userName},</p>
        <p>Your account has been created successfully. Here are your login credentials:</p>
        <div class="credentials">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        <p>Please keep this information secure and do not share it with anyone.</p>
        <p>You can now log in to your account by clicking the button below:</p>
        <a href="http://localhost:3000" class="button">Login Now</a>
        <p>If you have any questions, feel free to contact support.</p>
      </div>
      <div class="footer">
        <p>&copy; 2025 Quotation System. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `
}
