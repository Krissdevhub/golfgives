import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import supabase from '../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

export async function handleStripeWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    res.status(400).json({ error: `Webhook signature verification failed` });
    return;
  }

  try {
    switch (event.type) {
      // ── Subscription becomes active ───────────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const status = sub.status === 'active' ? 'active' : sub.status === 'canceled' ? 'cancelled' : 'lapsed';
        await supabase
          .from('subscriptions')
          .update({
            status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      // ── Subscription cancelled ────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      // ── Invoice paid — trigger charity donation calculation ─
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;

        if (!stripeSubId) break;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id, charity_id, charity_percentage, amount_pence')
          .eq('stripe_subscription_id', stripeSubId)
          .single();

        if (!sub || !sub.charity_id) break;

        const donationAmount = (sub.amount_pence * sub.charity_percentage) / 10000; // convert pence % to £
        const month = new Date().toISOString().slice(0, 7);

        await supabase.from('charity_donations').insert({
          user_id: sub.user_id,
          charity_id: sub.charity_id,
          subscription_id: stripeSubId,
          amount: donationAmount,
          donation_month: month,
        });

        // Update charity total
        await supabase.rpc('increment_charity_total', {
          charity_id_param: sub.charity_id,
          amount_param: donationAmount,
        });
        break;
      }

      // ── Invoice payment failed — lapse subscription ────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;

        if (!stripeSubId) break;

        await supabase
          .from('subscriptions')
          .update({ status: 'lapsed', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', stripeSubId);
        break;
      }

      default:
        // Unhandled event type — not an error
        break;
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}
