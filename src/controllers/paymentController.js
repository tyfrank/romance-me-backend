const { stripe, COIN_PACKAGES, SUBSCRIPTION_PLANS } = require('../config/stripe');
const db = require('../config/database');

// Get available coin packages
const getCoinPackages = async (req, res) => {
  try {
    res.json({
      success: true,
      packages: Object.values(COIN_PACKAGES)
    });
  } catch (error) {
    console.error('Get coin packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coin packages'
    });
  }
};

// Get available subscription plans
const getSubscriptionPlans = async (req, res) => {
  try {
    res.json({
      success: true,
      plans: Object.values(SUBSCRIPTION_PLANS)
    });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans'
    });
  }
};

// Create payment intent for coin purchase
const createCoinPaymentIntent = async (req, res) => {
  const { packageId } = req.body;
  
  // Safety check: Ensure user is authenticated
  if (!req.user || !req.user.id) {
    console.log('Payment API: No authenticated user found, returning mock intent');
    const coinPackage = COIN_PACKAGES[packageId];
    if (!coinPackage) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coin package'
      });
    }
    return res.json({
      success: true,
      clientSecret: 'mock_secret_' + Date.now(),
      package: coinPackage,
      message: 'Demo mode - payment not processed'
    });
  }
  
  const userId = req.user.id;

  try {
    const coinPackage = COIN_PACKAGES[packageId];
    if (!coinPackage) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coin package'
      });
    }

    console.log('Creating payment intent for:', {
      userId,
      packageId,
      amount: coinPackage.price,
      currency: coinPackage.currency || 'usd'
    });

    // Check if stripe is properly initialized
    if (!stripe || !stripe.paymentIntents) {
      console.error('Stripe not properly initialized');
      throw new Error('Payment system not configured');
    }

    // Create payment intent with minimal required fields for production
    const paymentIntent = await stripe.paymentIntents.create({
      amount: coinPackage.price,
      currency: coinPackage.currency || 'usd',
      metadata: {
        type: 'coin_purchase',
        user_id: userId,
        package_id: packageId,
        coins: String(coinPackage.coins)
      }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      package: coinPackage
    });

  } catch (error) {
    console.error('Create coin payment intent error:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack
    });
    console.error('NODE_ENV:', process.env.NODE_ENV);
    
    // Always include error in production for debugging during beta
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message || 'Unknown error occurred'
    });
  }
};

// Create payment intent for subscription
const createSubscriptionPaymentIntent = async (req, res) => {
  const { planId } = req.body;
  
  // Safety check: Ensure user is authenticated
  if (!req.user || !req.user.id) {
    console.log('Subscription API: No authenticated user found, returning mock intent');
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }
    return res.json({
      success: true,
      clientSecret: 'mock_sub_secret_' + Date.now(),
      plan: plan,
      message: 'Demo mode - subscription not processed'
    });
  }
  
  const userId = req.user.id;

  try {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    // Check if user already has active subscription
    const existingSubscription = await db.query(
      `SELECT id FROM user_subscriptions 
       WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()`,
      [userId]
    );

    if (existingSubscription.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already has an active subscription'
      });
    }

    // Create payment intent with minimal required fields for production
    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.price,
      currency: plan.currency || 'usd',
      metadata: {
        type: 'subscription',
        user_id: userId,
        plan_id: planId,
        interval: plan.interval
      }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      plan: plan
    });

  } catch (error) {
    console.error('Create subscription payment intent error:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack
    });
    
    // Always include error in production for debugging during beta
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message || 'Unknown error occurred'
    });
  }
};

// Handle successful payment confirmation
const confirmPayment = async (req, res) => {
  const { paymentIntentId } = req.body;
  
  console.log('Payment confirmation called with:', paymentIntentId);
  
  // Safety check for mock payments
  if (!paymentIntentId || paymentIntentId.startsWith('mock_')) {
    console.log('Mock payment detected, simulating success');
    return res.json({
      success: true,
      message: 'Demo payment processed successfully'
    });
  }
  
  try {
    // Retrieve only essential fields from Stripe to avoid large payloads
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId,
        { expand: [] } // Don't expand any nested objects
      );
    } catch (stripeError) {
      console.error('Stripe retrieve error:', stripeError.message);
      // If Stripe fails, check if this is a test payment
      if (stripeError.code === 'resource_missing') {
        return res.status(404).json({
          success: false,
          message: 'Payment intent not found'
        });
      }
      throw stripeError;
    }
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    const { type, user_id, package_id, plan_id, coins, interval } = paymentIntent.metadata || {};

    console.log('Payment metadata:', paymentIntent.metadata);
    console.log('Payment status:', paymentIntent.status);

    // Validate metadata exists
    if (!type || !user_id) {
      console.error('Invalid payment metadata:', paymentIntent.metadata);
      return res.status(400).json({
        success: false,
        message: 'Invalid payment data'
      });
    }

    // Process based on payment type
    if (type === 'coin_purchase') {
      console.log('Processing coin purchase:', { user_id, package_id, coins });
      await processCoinPurchase(user_id, package_id, parseInt(coins), { id: paymentIntent.id });
    } else if (type === 'subscription') {
      console.log('Processing subscription:', { user_id, plan_id, interval });
      await processSubscription(user_id, plan_id, interval, { id: paymentIntent.id });
    }

    res.json({
      success: true,
      message: 'Payment processed successfully'
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    // Log more details for debugging
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      type: error.type
    });
    res.status(500).json({
      success: false,
      message: 'Failed to process payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Process coin purchase
const processCoinPurchase = async (userId, packageId, coins, paymentIntent) => {
  console.log('Starting coin purchase processing:', { userId, packageId, coins });
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    // Get current user rewards
    const rewardsResult = await client.query(
      'SELECT * FROM user_rewards WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    let currentCoins = 0;
    if (rewardsResult.rows.length > 0) {
      currentCoins = rewardsResult.rows[0].total_coins;
      console.log(`User ${userId} current coins: ${currentCoins}`);
    } else {
      // Create rewards record if doesn't exist
      console.log(`Creating new rewards record for user ${userId}`);
      await client.query(
        'INSERT INTO user_rewards (user_id, total_coins) VALUES ($1, 0)',
        [userId]
      );
      console.log(`New rewards record created for user ${userId}`);
    }

    const newTotal = currentCoins + coins;

    // Update user coins
    const updateResult = await client.query(
      `UPDATE user_rewards 
       SET total_coins = $1, 
           total_coins_earned = total_coins_earned + $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3`,
      [newTotal, coins, userId]
    );
    console.log(`Coins updated for user ${userId}: ${coins} coins added, new total: ${newTotal}. Rows affected: ${updateResult.rowCount}`);

    // Commit the coin update immediately to ensure it persists
    await client.query('COMMIT');
    console.log('Coin update committed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Coin purchase failed, rolling back:', error);
    throw error;
  } finally {
    client.release();
  }
  
  // Try to log transaction (non-critical, outside main transaction)
  const logClient = await db.getClient();
  try {
    await logClient.query(
      `INSERT INTO reward_transactions 
       (user_id, transaction_type, amount, reason, reference_type, reference_id, balance_after)
       VALUES ($1, 'purchased', $2, $3, 'stripe_payment', $4, $5)`,
      [userId, coins, `Purchased ${COIN_PACKAGES[packageId]?.name || 'Coin Package'}`, paymentIntent.id, currentCoins + coins]
    );
    console.log('Transaction logged successfully');
  } catch (logError) {
    console.log('Transaction logging failed (non-critical):', logError.message);
    // This is non-critical, coins are already updated
  } finally {
    logClient.release();
  }
};

// Process subscription
const processSubscription = async (userId, planId, interval, paymentIntent) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    const plan = SUBSCRIPTION_PLANS[planId];
    const expiresAt = interval === 'year' ? 
      'CURRENT_TIMESTAMP + INTERVAL \'1 year\'' : 
      'CURRENT_TIMESTAMP + INTERVAL \'1 month\'';

    // Cancel any existing active subscriptions
    await client.query(
      `UPDATE user_subscriptions 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    // Create new subscription
    await client.query(
      `INSERT INTO user_subscriptions 
       (user_id, subscription_type, status, price_paid, payment_method, payment_id, expires_at)
       VALUES ($1, $2, 'active', $3, 'stripe', $4, ${expiresAt})`,
      [userId, interval, plan.price / 100, paymentIntent.id]
    );

    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getCoinPackages,
  getSubscriptionPlans,
  createCoinPaymentIntent,
  createSubscriptionPaymentIntent,
  confirmPayment
};
