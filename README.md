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
| Homepage / Product Listing | ![Homepage](https://i.ibb.co/7xQVZ4nM/Screenshot-2025-10-24-at-6-48-15-PM.png) |
| Product Detail | ![Product Detail](https://i.ibb.co/MxLLRk1b/Screenshot-2025-10-24-at-6-48-22-PM.png) |
| Shopping Cart | ![Cart](https://i.ibb.co/Wp5rvxnV/Screenshot-2025-10-24-at-6-49-26-PM.png) |
| Login/Signup (OTP) | ![Auth OTP](https://i.ibb.co/5xnNSPfv/Screenshot-2025-10-24-at-6-50-15-PM.png) |
| Profile (View/Edit) | ![Profile](https://i.ibb.co/tpWfYzxh/Screenshot-2025-10-24-at-6-48-44-PM.png) |
| Order History | ![Order History](https://i.ibb.co/kgd2tTdj/Screenshot-2025-10-24-at-6-48-37-PM.png) |
| Checkout Page | ![Checkout](https://i.ibb.co/vGRTM2h/Screenshot-2025-10-24-at-6-49-32-PM.png) |
| Seller Application | ![Seller Form](https://i.ibb.co/WNdgK7Ck/Screenshot-2025-10-24-at-6-50-57-PM.png) |
| Seller Dashboard | ![Seller Dashboard](https://i.ibb.co/GQFQK0vb/Screenshot-2025-10-24-at-6-48-50-PM.png) |

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


<div align="center"> <sub>Built with ❤️ by <a href="https://github.com/garvit027">Garvit Juneja</a></sub><br/> <sub>Powered by MERN Stack • Deployed on Vercel & Render</sub> </div> 

