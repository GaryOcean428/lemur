// server/services/stripeService.ts

import Stripe from "stripe";
import { db, FieldValue } from "../firebaseAdmin";
import { TIER_MODEL_PREFERENCES, TierModelPreference } from "../config/modelConfig"; // Assuming tier definitions might be useful

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET_KEY) {
  console.warn("Stripe secret key not found. Stripe functionality will be disabled.");
}
if (!STRIPE_WEBHOOK_SECRET) {
  console.warn("Stripe webhook secret not found. Webhook processing will be disabled or insecure.");
}

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" }) : null;

// Define your product IDs from your Stripe dashboard
// These should ideally be stored in environment variables or a config file
const PRODUCT_IDS = {
  BASIC: process.env.STRIPE_BASIC_PRODUCT_ID || "prod_XXXXXXXXXXXXXX", // Replace with actual Basic Product ID
  PRO: process.env.STRIPE_PRO_PRODUCT_ID || "prod_YYYYYYYYYYYYYY",   // Replace with actual Pro Product ID
};

const PRICE_IDS = {
  BASIC_MONTHLY: process.env.STRIPE_BASIC_PRICE_ID || "price_XXXXXXXXXXXXXX", // Replace with actual Basic Monthly Price ID
  PRO_MONTHLY: process.env.STRIPE_PRO_PRICE_ID || "price_YYYYYYYYYYYYYY",     // Replace with actual Pro Monthly Price ID
  // Add yearly or other options if needed
};

interface UserSubscriptionData {
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: Date;
  tier: "free" | "basic" | "pro";
  status: "active" | "canceled" | "incomplete" | "past_due" | "trialing" | "unpaid";
}

/**
 * Creates or retrieves a Stripe customer for a given Firebase user ID.
 * @param userId Firebase User UID.
 * @param email User's email.
 * @param name User's display name (optional).
 * @returns Stripe Customer object.
 */
export const getOrCreateStripeCustomer = async (userId: string, email: string, name?: string): Promise<Stripe.Customer | null> => {
  if (!stripe) return null;

  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();

  if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(userDoc.data()!.stripeCustomerId);
      if (!customer.deleted) return customer as Stripe.Customer; 
      // if customer is deleted in stripe, create a new one
    } catch (error) {
      console.warn(`Could not retrieve Stripe customer ${userDoc.data()!.stripeCustomerId}, creating a new one. Error: ${error}`);
    }
  }

  // Create a new customer in Stripe
  const customerParams: Stripe.CustomerCreateParams = {
    email: email,
    metadata: {
      firebaseUID: userId,
    },
  };
  if (name) customerParams.name = name;

  try {
    const customer = await stripe.customers.create(customerParams);
    // Add the Stripe customer ID to the user's document in Firestore
    await userRef.set({ stripeCustomerId: customer.id, email: email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    console.log(`Stripe customer ${customer.id} created for user ${userId}`);
    return customer;
  } catch (error) {
    console.error(`Error creating Stripe customer for user ${userId}:`, error);
    return null;
  }
};

/**
 * Creates a Stripe Checkout session for a subscription.
 * @param customerId Stripe Customer ID.
 * @param priceId Stripe Price ID for the subscription.
 * @param successUrl URL to redirect to on successful payment.
 * @param cancelUrl URL to redirect to on cancelled payment.
 * @returns Stripe Checkout Session object.
 */
export const createSubscriptionCheckoutSession = async (
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session | null> => {
  if (!stripe) return null;

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl, // e.g., `${YOUR_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`
      cancel_url: cancelUrl,   // e.g., `${YOUR_DOMAIN}/payment-cancelled`
      // automatic_tax: { enabled: true }, // If you have Stripe Tax configured
      // subscription_data: { // Optional: if you want to set trial period, etc.
      //   trial_period_days: 7 
      // }
    });
    return session;
  } catch (error) {
    console.error("Error creating Stripe Checkout session:", error);
    return null;
  }
};

/**
 * Creates a Stripe customer portal session for managing subscriptions.
 * @param customerId Stripe Customer ID.
 * @param returnUrl URL to redirect to after leaving the portal.
 * @returns Stripe Billing Portal Session object.
 */
export const createBillingPortalSession = async (customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session | null> => {
  if (!stripe) return null;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl, // e.g., `${YOUR_DOMAIN}/account`
    });
    return portalSession;
  } catch (error) {
    console.error("Error creating Stripe Billing Portal session:", error);
    return null;
  }
};

/**
 * Handles Stripe webhook events, specifically for subscriptions.
 * @param signature The `Stripe-Signature` header from the request.
 * @param rawBody The raw request body.
 * @returns True if handled successfully, false otherwise.
 */
export const handleStripeWebhook = async (signature: string | string[] | undefined, rawBody: Buffer): Promise<boolean> => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET || !signature) return false;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return false;
  }

  const dataObject = event.data.object as any; // Type assertion to access properties

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": // Handles cancellations
    case "customer.subscription.trial_will_end":
      const subscription = dataObject as Stripe.Subscription;
      await updateUserSubscriptionStatus(subscription);
      console.log(`Subscription event ${event.type} processed for ${subscription.id}`);
      break;

    case "invoice.payment_succeeded":
      // If a payment succeeds, especially for a subscription renewal
      if (dataObject.subscription) {
        const subscription = await stripe.subscriptions.retrieve(dataObject.subscription as string);
        await updateUserSubscriptionStatus(subscription);
        console.log(`Invoice payment succeeded, subscription ${subscription.id} status updated.`);
      }
      break;

    case "invoice.payment_failed":
      // If a payment fails, you might want to update the subscription status or notify the user
      if (dataObject.subscription) {
        const subscription = await stripe.subscriptions.retrieve(dataObject.subscription as string);
        await updateUserSubscriptionStatus(subscription);
        console.log(`Invoice payment failed for subscription ${subscription.id}. Status updated.`);
      }
      break;

    case "checkout.session.completed":
      // This event is often used to fulfill the purchase, e.g., provision access
      // For subscriptions, customer.subscription.created/updated is usually more direct for managing status
      if (dataObject.mode === "subscription" && dataObject.subscription) {
        const subscription = await stripe.subscriptions.retrieve(dataObject.subscription as string);
        await updateUserSubscriptionStatus(subscription);
        console.log(`Checkout session completed, subscription ${subscription.id} status updated.`);
      }
      break;

    default:
      console.log(`Unhandled Stripe webhook event type: ${event.type}`);
  }
  return true;
};

/**
 * Updates the user's subscription status in Firestore based on a Stripe subscription object.
 * @param subscription Stripe Subscription object.
 */
const updateUserSubscriptionStatus = async (subscription: Stripe.Subscription): Promise<void> => {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const usersRef = db.collection("users");
  const querySnapshot = await usersRef.where("stripeCustomerId", "==", customerId).limit(1).get();

  if (querySnapshot.empty) {
    console.error(`No user found with Stripe customer ID: ${customerId}`);
    return;
  }
  const userDoc = querySnapshot.docs[0];
  const userId = userDoc.id;

  const priceId = subscription.items.data[0]?.price.id;
  let newTier: "free" | "basic" | "pro" = "free";

  if (subscription.status === "active" || subscription.status === "trialing") {
    if (priceId === PRICE_IDS.PRO_MONTHLY) {
      newTier = "pro";
    } else if (priceId === PRICE_IDS.BASIC_MONTHLY) {
      newTier = "basic";
    }
  }
  // If status is canceled, past_due, etc., they revert to 'free' or you might have a grace period logic.

  const subscriptionData: Partial<UserSubscriptionData> = {
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    tier: newTier,
    status: subscription.status as UserSubscriptionData["status"],
  };

  try {
    await userDoc.ref.update({
      ...subscriptionData,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`User ${userId} subscription status updated to ${newTier} (${subscription.status}) in Firestore.`);
  } catch (error) {
    console.error(`Error updating user ${userId} subscription status in Firestore:`, error);
  }
};

export { PRICE_IDS, PRODUCT_IDS }; // Export for use in routes

