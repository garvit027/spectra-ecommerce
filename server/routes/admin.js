import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Ensure this path is correct

const router = express.Router();

// Middleware to protect admin routes.
const protectAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: 'Not authorized, not an admin' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Endpoint to approve a seller application
router.put('/verify-seller/:token', protectAdmin, async (req, res) => {
    const { token } = req.params;
    try {
        const user = await User.findOne({ sellerApprovalToken: token, sellerStatus: 'pending' });

        if (!user) {
            return res.status(404).json({ message: 'User not found or already processed.' });
        }

        user.isSeller = true;
        user.sellerStatus = 'approved';
        user.sellerApprovalToken = undefined;
        await user.save();

        res.status(200).json({ message: 'Seller application approved successfully.', redirectPath: '/verified-success' });
    } catch (error) {
        console.error('Error approving seller:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Endpoint to reject a seller application
router.put('/reject-seller/:token', protectAdmin, async (req, res) => {
    const { token } = req.params;
    try {
        const user = await User.findOne({ sellerApprovalToken: token, sellerStatus: 'pending' });

        if (!user) {
            return res.status(404).json({ message: 'User not found or already processed.' });
        }

        user.isSeller = false;
        user.sellerStatus = 'rejected';
        user.sellerApprovalToken = undefined;
        await user.save();

        res.status(200).json({ message: 'Seller application rejected successfully.', redirectPath: '/rejected-status' });
    } catch (error) {
        console.error('Error rejecting seller:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
