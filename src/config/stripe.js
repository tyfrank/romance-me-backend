const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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