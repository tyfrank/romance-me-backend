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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: coinPackage.price,
      currency: coinPackage.currency,
      metadata: {
        type: 'coin_purchase',
        user_id: userId,
        package_id: packageId,
        coins: coinPackage.coins.toString()
      },
      description: `${coinPackage.name} - ${coinPackage.description}`
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      package: coinPackage
    });

  } catch (error) {
    console.error('Create coin payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent'
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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.price,
      currency: plan.currency,
      metadata: {
        type: 'subscription',
        user_id: userId,
        plan_id: planId,
        interval: plan.interval
      },
      description: `${plan.name} - ${plan.description}`
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      plan: plan
    });

  } catch (error) {
    console.error('Create subscription payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent'
    });
  }
};

// Handle successful payment confirmation
const confirmPayment = async (req, res) => {
  const { paymentIntentId } = req.body;
  
  try {
    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    const { type, user_id, package_id, plan_id, coins, interval } = paymentIntent.metadata;

    if (type === 'coin_purchase') {
      await processCoinPurchase(user_id, package_id, parseInt(coins), paymentIntent);
    } else if (type === 'subscription') {
      await processSubscription(user_id, plan_id, interval, paymentIntent);
    }

    res.json({
      success: true,
      message: 'Payment processed successfully'
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment'
    });
  }
};

// Process coin purchase
const processCoinPurchase = async (userId, packageId, coins, paymentIntent) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    // Ensure payment tables exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_rewards (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_coins INTEGER DEFAULT 0,
        total_coins_earned INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_check_in TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reward_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_type VARCHAR(20) NOT NULL,
        amount INTEGER NOT NULL,
        reason VARCHAR(255),
        reference_type VARCHAR(50),
        reference_id VARCHAR(255),
        balance_after INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subscription_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        price_paid DECIMAL(10,2),
        payment_method VARCHAR(50),
        payment_id VARCHAR(255),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_chapter_unlocks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        chapter_number INTEGER NOT NULL,
        unlock_method VARCHAR(20) NOT NULL,
        coins_spent INTEGER DEFAULT 0,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id, chapter_number)
      );
    `);

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
        'INSERT INTO user_rewards (user_id) VALUES ($1)',
        [userId]
      );
      console.log(`New rewards record created for user ${userId}`);
    }

    const newTotal = currentCoins + coins;

    // Update user coins
    try {
      const updateResult = await client.query(
        `UPDATE user_rewards 
         SET total_coins = $1, 
             total_coins_earned = total_coins_earned + $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3`,
        [newTotal, coins, userId]
      );
      console.log(`Coins updated for user ${userId}: ${coins} coins added, new total: ${newTotal}. Rows affected: ${updateResult.rowCount}`);
    } catch (updateError) {
      console.error('Failed to update user coins:', updateError);
      throw updateError; // Re-throw to rollback transaction
    }

    // Record transaction (with error handling for missing tables)
    try {
      await client.query(
        `INSERT INTO reward_transactions 
         (user_id, transaction_type, amount, reason, reference_type, reference_id, balance_after)
         VALUES ($1, 'purchased', $2, $3, 'stripe_payment', $4, $5)`,
        [userId, coins, `Purchased ${COIN_PACKAGES[packageId].name}`, paymentIntent.id, newTotal]
      );
    } catch (insertError) {
      console.log('Transaction logging failed (table may not exist), but payment succeeded:', insertError.message);
      // Continue with payment success even if transaction logging fails
    }

    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
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
