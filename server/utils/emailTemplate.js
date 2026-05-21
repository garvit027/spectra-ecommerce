export const getEmailTemplate = (title, contentHTML) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        background-color: #f3f4f6;
        color: #374151;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }
      .header {
        background-color: #7c3aed;
        padding: 30px 20px;
        text-align: center;
      }
      .header h1 {
        color: #ffffff;
        margin: 0;
        font-size: 28px;
        letter-spacing: 1px;
      }
      .content {
        padding: 30px;
        line-height: 1.6;
        font-size: 16px;
      }
      .content h2 {
        color: #111827;
        margin-top: 0;
      }
      .footer {
        background-color: #f9fafb;
        padding: 20px;
        text-align: center;
        font-size: 14px;
        color: #6b7280;
        border-top: 1px solid #e5e7eb;
      }
      .btn {
        display: inline-block;
        padding: 12px 24px;
        background-color: #7c3aed;
        color: #ffffff !important;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
        margin-top: 20px;
      }
      .otp-box {
        background-color: #f3f4f6;
        border: 1px dashed #d1d5db;
        padding: 15px;
        text-align: center;
        font-size: 32px;
        font-weight: bold;
        letter-spacing: 8px;
        color: #7c3aed;
        margin: 20px 0;
        border-radius: 8px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>SPECTRA COMMERCE</h1>
      </div>
      <div class="content">
        ${title ? `<h2>${title}</h2>` : ''}
        ${contentHTML}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Spectra Commerce. All rights reserved.</p>
        <p>123 Spectra Street, Tech City, TC 10010</p>
      </div>
    </div>
  </body>
  </html>
  `;
};
