const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');

// All payment routes require authentication
router.use(requireAuth);

// Get available packages and plans
router.get('/coins/packages', paymentController.getCoinPackages);
router.get('/subscriptions/plans', paymentController.getSubscriptionPlans);

// Create payment intents
router.post('/coins/create-intent', paymentController.createCoinPaymentIntent);
router.post('/subscriptions/create-intent', paymentController.createSubscriptionPaymentIntent);

// Confirm payment
router.post('/confirm', paymentController.confirmPayment);

module.exports = router;