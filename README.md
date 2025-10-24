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


