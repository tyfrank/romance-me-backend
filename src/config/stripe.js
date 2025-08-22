// Safe Stripe initialization with mock fallback
let stripe;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    // Validate Stripe key format
    const key = process.env.STRIPE_SECRET_KEY.trim();
    if (!key.startsWith('sk_test_') && !key.startsWith('sk_live_')) {
      console.error('Invalid Stripe key format. Must start with sk_test_ or sk_live_');
      throw new Error('Invalid Stripe key format');
    }
    
    // Initialize Stripe with production-ready configuration
    const Stripe = require('stripe');
    stripe = new Stripe(key, {
      apiVersion: '2023-10-16', // Use stable API version
      maxNetworkRetries: 2, // Retry on network failures
      timeout: 20000, // 20 second timeout for production
      telemetry: false // Disable telemetry to reduce payload size
    });
    console.log(`Stripe initialized with ${key.startsWith('sk_test_') ? 'TEST' : 'LIVE'} key and production config`);
  } else {
    console.log('Stripe API key not found, using mock payment processor');
    stripe = {
      paymentIntents: {
        create: async (options) => ({
          id: 'mock_pi_' + Date.now(),
          client_secret: 'mock_secret_' + Date.now(),
          amount: options.amount,
          currency: options.currency,
          status: 'requires_payment_method',
          metadata: options.metadata || {}
        }),
        retrieve: async (id) => ({
          id: id,
          status: 'succeeded',
          metadata: {
            type: 'coin_purchase',
            user_id: '123',
            package_id: 'small',
            coins: '500'
          }
        })
      },
      subscriptions: {
        create: async (options) => ({
          id: 'mock_sub_' + Date.now(),
          customer: options.customer,
          items: options.items,
          status: 'active'
        })
      },
      customers: {
        create: async (options) => ({
          id: 'mock_cus_' + Date.now(),
          email: options.email
        })
      }
    };
  }
} catch (error) {
  console.error('Error initializing Stripe:', error);
  // Use mock Stripe for development
  stripe = {
    paymentIntents: {
      create: async () => ({ client_secret: 'mock_secret' }),
      retrieve: async (id) => ({
        id: id,
        status: 'succeeded',
        metadata: {
          type: 'coin_purchase',
          user_id: '123',
          package_id: 'small',
          coins: '500'
        }
      })
    }
  };
}

// Coin packages configuration
const COIN_PACKAGES = {
  small: {
    id: 'small',
    coins: 500,
    price: 499, // $4.99 in cents
    currency: 'usd',
    name: '500 Coins',
    description: 'Best for casual readers'
  },
  popular: {
    id: 'popular',
    coins: 1500,
    price: 799, // $7.99 in cents  
    currency: 'usd',
    name: '1,500 Coins',
    description: 'Most popular - 25% bonus!',
    bonus: true
  },
  premium: {
    id: 'premium',
    coins: 3500,
    price: 1499, // $14.99 in cents
    currency: 'usd', 
    name: '3,500 Coins',
    description: 'Best value - 40% bonus!',
    bonus: true
  }
};

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  monthly: {
    id: 'monthly',
    price: 999, // $9.99 in cents
    currency: 'usd',
    interval: 'month',
    name: 'Monthly Subscription',
    description: 'Unlimited reading for one month'
  },
  yearly: {
    id: 'yearly', 
    price: 6499, // $64.99 in cents
    currency: 'usd',
    interval: 'year',
    name: 'Yearly Subscription',
    description: 'Unlimited reading for one year - Save 62%!',
    discount: '62%'
  }
};

module.exports = {
  stripe,
  COIN_PACKAGES,
  SUBSCRIPTION_PLANS
};