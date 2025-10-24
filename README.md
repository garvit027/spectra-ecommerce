<div align="center">

# 🛍️ **Spectra E-Commerce Platform**

![GitHub repo size](https://img.shields.io/github/repo-size/garvit027/spectra-ecommerce?color=brightgreen&style=for-the-badge)
![GitHub stars](https://img.shields.io/github/stars/garvit027/spectra-ecommerce?color=yellow&style=for-the-badge)
![GitHub forks](https://img.shields.io/github/forks/garvit027/spectra-ecommerce?color=blue&style=for-the-badge)
![License](https://img.shields.io/github/license/garvit027/spectra-ecommerce?color=orange&style=for-the-badge)
![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen?style=for-the-badge)
![Made with MERN](https://img.shields.io/badge/MADE%20WITH-MERN-blue?style=for-the-badge)

</div>

A modern, full-stack **e-commerce application** built using the **MERN stack (MongoDB, Express, React, Node.js)**.  
Spectra provides a seamless shopping experience with OTP-based authentication, powerful seller management, and an admin dashboard—all wrapped in a sleek, responsive UI powered by **Tailwind CSS**.

---

## 🚀 **Live Demo**

- **Frontend (Vercel):** [https://spectra-ecommerce.vercel.app](https://spectra-ecommerce.vercel.app)  
- **Backend API (Render):** [https://spectra-ecommerce.onrender.com](https://spectra-ecommerce.onrender.com)

*(Replace these links with your actual deployment URLs if different.)*

---

## 📖 **Table of Contents**

1. [Overview](#-project-overview)
2. [Features](#-features)
3. [Screenshots](#-screenshots)
4. [Tech Stack](#-technology-stack)
5. [Architecture](#-architecture)
6. [Getting Started](#-getting-started)
7. [Environment Variables](#-environment-variables)
8. [Troubleshooting](#-troubleshooting)
9. [Future Enhancements](#-future-enhancements)
10. [Contributors](#-contributors)
11. [License](#-license)

---

## 🧩 **Project Overview**

**Spectra** is a full-stack e-commerce platform that showcases **modern web development practices**.  
It’s designed with a **decoupled architecture**, where the React frontend communicates with a Node.js/Express REST API backend connected to a **MongoDB Atlas** database.

### 🎯 **Highlights**

- 🔑 OTP-based authentication (Email/SMS)
- 🧑‍🤝‍🧑 Role-based Access Control (User, Seller, Admin)
- 🛍️ Full product and order management
- 💼 Seller onboarding and admin approval workflows
- 🎨 Responsive, clean UI with Tailwind CSS
- ☁️ Cloud-hosted on **Vercel + Render + MongoDB Atlas**

---

## ✨ **Features**

### 🔐 Authentication
- Secure OTP-based login/signup via email.
- JWT-managed user sessions.

### 🛒 Product & Shopping
- Browse, search, and view product details with gallery & zoom.
- Related product suggestions.
- Add/remove/update items in cart.
- “Buy Now” or multi-item checkout.
- Order confirmation & history.

### 👤 User Profile
- View & edit user details (name, age, contact, address).
- Access order history.

### 🏪 Seller System
- Multi-step seller application form.
- OTP-based mobile verification (Twilio/Test mode).
- Admin review/approval workflow.
- Seller dashboard:
  - Product CRUD
  - Orders & sales stats
  - Store availability/vacation modes

### 🧑‍💼 Admin Capabilities
- Approve/reject seller applications.
- View/manage all orders and products.
- (Future) Manage users & categories.

---

## 🖼️ **Screenshots**

> Replace the placeholder image links below with actual screenshots.

| Page | Screenshot |
|------|-------------|
| Homepage / Product Listing | ![Homepage](path/to/homepage.png) |
| Product Detail | ![Product Detail](path/to/product-detail.png) |
| Shopping Cart | ![Cart](path/to/cart.png) |
| Login/Signup (OTP) | ![Auth OTP](path/to/auth.png) |
| Profile (View/Edit) | ![Profile](path/to/profile.png) |
| Order History | ![Order History](path/to/order-history.png) |
| Checkout Page | ![Checkout](path/to/checkout.png) |
| Seller Application | ![Seller Form](path/to/seller-form.png) |
| Seller Dashboard | ![Seller Dashboard](path/to/seller-dashboard.png) |
| Admin Review Page | ![Admin Review](path/to/admin-review.png) |

---

## 🧱 **Technology Stack**

### 🖥️ **Frontend**
- React (CRA)
- React Router v6
- Tailwind CSS
- React Context API (Auth & Cart)
- Lucide React Icons
- Fetch API / Custom API Client

### ⚙️ **Backend**
- Node.js + Express.js
- MongoDB Atlas + Mongoose
- JSON Web Tokens (JWT)
- Nodemailer (Email OTP & Notifications)
- Twilio (SMS OTP, optional)
- bcryptjs
- cors, dotenv, express-async-handler

### 🗄️ **Database**
- MongoDB Atlas (Cloud-hosted NoSQL)

### ☁️ **Deployment**
- **Frontend:** Vercel  
- **Backend:** Render  
- **Database:** MongoDB Atlas  

---

## 🏗️ **Architecture**

Spectra follows a **decoupled client-server architecture**:

           ┌──────────────────────────────┐
           │         FRONTEND             │
           │  React SPA (Vercel)          │
           └──────────────┬───────────────┘
                          │
                          ▼
           ┌──────────────────────────────┐
           │          BACKEND             │
           │ Node.js + Express (Render)   │
           └──────────────┬───────────────┘
                          │
                          ▼
           ┌──────────────────────────────┐
           │          DATABASE            │
           │   MongoDB Atlas (Cloud)      │
           └──────────────────────────────┘


- **Client:** React SPA hosted on **Vercel**  
- **Server:** Node.js/Express API hosted on **Render**  
- **Database:** Cloud MongoDB via **Atlas**

---

## ⚙️ **Getting Started**

### 🧰 Prerequisites
- Node.js (v18+)
- npm or yarn
- MongoDB (local or Atlas)
- Git

---

### 📦 **Installation**

```bash
# 1. Clone the repository
git clone https://github.com/garvit027/spectra-ecommerce.git
cd spectra-ecommerce

## 🖥️ **Backend Setup**

```bash
cd server
npm install
Create .env in /server (see Environment Variables).

bash
Copy code
npm run dev   # For nodemon
# or
npm start
Runs at: http://localhost:8080

💻 Frontend Setup
bash
Copy code
cd ../client
npm install
Create .env in /client:

env
Copy code
REACT_APP_API_URL=http://localhost:8080
Start React app:

bash
Copy code
npm start
Runs at: http://localhost:3000

🔑 Environment Variables
🧩 server/.env
env
Copy code
NODE_ENV=development
PORT=8080
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/spectra
DB_NAME=spectra
JWT_SECRET=YOUR_VERY_STRONG_JWT_SECRET
FRONTEND_URL=http://localhost:3000

# Email (Gmail Example)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_google_app_password

# Admin Email
ADMIN_EMAIL=your_admin_email@example.com

# Twilio (Optional)
# TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_AUTH_TOKEN=your_auth_token
# TWILIO_PHONE=+1xxxxxxxxxx
# TEST_MODE=true
💻 client/.env
env
Copy code
REACT_APP_API_URL=http://localhost:8080
🧩 Troubleshooting
Issue	Possible Fix
MongoDB connection error	Ensure .env has a valid MONGO_URI.
CORS blocked requests	Check FRONTEND_URL in backend .env.
OTP not sending	Use Gmail App Password or Twilio Test Mode.
Frontend not loading	Confirm REACT_APP_API_URL points to backend.
JWT verification fails	Regenerate JWT_SECRET.

🧠 Future Enhancements
💳 Payment Gateway Integration (Stripe / Razorpay)

🏷️ Product Categories & Advanced Filtering

📊 Admin Analytics Dashboard

📬 Enhanced Email Templates

🌍 Multi-language Support

🔔 Real-time Notifications via WebSockets

👨‍💻 Contributors
Name	Role	GitHub
Garvit Sharma	Full-Stack Developer	@garvit027

Contributions, issues, and feature requests are welcome!
👉 Open an Issue or Create a Pull Request.

📝 License
This project is licensed under the MIT License.
See the LICENSE file for details.

<div align="center"> <sub>Built with ❤️ by <a href="https://github.com/garvit027">Garvit Sharma</a></sub><br/> <sub>Powered by MERN Stack • Deployed on Vercel & Render</sub> </div> ```

