import express from 'express';
import User from '../models/User.js';
import { protectAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Endpoint to approve a seller application via token
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
        user.businessInfo.approvedAt = new Date();
        await user.save();

        res.status(200).json({ message: 'Seller application approved successfully.', redirectPath: '/verified-success' });
    } catch (error) {
        console.error('Error approving seller:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Endpoint to reject a seller application via token
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

// Endpoint to list all pending seller applications (direct dashboard access)
router.get('/seller-applications', protectAdmin, async (req, res) => {
    try {
        const users = await User.find({ sellerStatus: 'pending' }).select('-password -__v').lean();
        const applications = users.map(user => ({
            userId: user._id,
            name: user.name,
            email: user.email,
            businessName: user.businessInfo?.businessName || '',
            businessType: user.businessInfo?.businessType || '',
            phone: user.businessInfo?.phone || '',
            address: user.businessInfo?.address || '',
            taxId: user.businessInfo?.taxId || '',
            description: user.businessInfo?.description || '',
            appliedAt: user.businessInfo?.appliedAt || user.createdAt
        }));
        res.json(applications);
    } catch (error) {
        console.error('Error listing seller applications:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Endpoint to approve a seller application directly by userId
router.post('/verify-seller-direct/:userId', protectAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user || user.sellerStatus !== 'pending') {
            return res.status(404).json({ message: 'Seller application not found or already processed.' });
        }

        user.isSeller = true;
        user.sellerStatus = 'approved';
        user.sellerApprovalToken = undefined;
        user.businessInfo.approvedAt = new Date();
        await user.save();

        res.status(200).json({ message: 'Seller application approved successfully.' });
    } catch (error) {
        console.error('Error approving seller directly:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Endpoint to reject a seller application directly by userId
router.post('/reject-seller-direct/:userId', protectAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;
        const user = await User.findById(userId);

        if (!user || user.sellerStatus !== 'pending') {
            return res.status(404).json({ message: 'Seller application not found or already processed.' });
        }

        user.isSeller = false;
        user.sellerStatus = 'rejected';
        user.sellerRejectionReason = reason || 'No reason provided';
        user.sellerApprovalToken = undefined;
        await user.save();

        res.status(200).json({ message: 'Seller application rejected successfully.' });
    } catch (error) {
        console.error('Error rejecting seller directly:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
