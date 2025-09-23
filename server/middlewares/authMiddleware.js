// backend/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const getTokenFromReq = (req) => {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.split(" ")[1];
  // fallback to query (use only for non-production/testing)
  if (req.query && req.query.token) return req.query.token;
  return null;
};

export const protect = async (req, res, next) => {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ message: "Not authorized, no token" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }

    const user = await User.findById(decoded.id).select("-password -__v");
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (e) {
    console.error("protect error", e);
    res.status(401).json({ message: "Not authorized" });
  }
};

export const protectSeller = async (req, res, next) => {
  await protect(req, res, async () => {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });
    // Accept isSeller true OR isAdmin true
    if (!req.user.isSeller && !req.user.isAdmin) {
      return res.status(403).json({ message: "Seller/Admin only" });
    }
    next();
  });
};

export const protectAdmin = async (req, res, next) => {
  await protect(req, res, async () => {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Admin only" });
    next();
  });
};


// // server/middlewares/authMiddleware.js
// import jwt from "jsonwebtoken";
// import User from "../models/User.js";

// export const protect = async (req, res, next) => {
//   try {
//     const auth = req.headers.authorization || "";
//     if (!auth.startsWith("Bearer ")) return res.status(401).json({ message: "No token" });
//     const token = auth.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.id).lean();
//     if (!user) return res.status(401).json({ message: "User not found" });
//     req.user = user;
//     next();
//   } catch (e) {
//     return res.status(401).json({ message: "Invalid token" });
//   }
// };

// export const protectSeller = async (req, res, next) => {
//   await protect(req, res, async () => {
//     if (!req.user?.isSeller) return res.status(403).json({ message: "Seller only" });
//     next();
//   });
// };

// export const protectAdmin = async (req, res, next) => {
//   await protect(req, res, async () => {
//     if (!req.user?.isAdmin) return res.status(403).json({ message: "Admin only" });
//     next();
//   });
// };