import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Note: We need a Service Role client here to update any user's profile
// without a user session.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('Stripe-Signature') as string;

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error: any) {
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    const session = event.data.object as any;

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const userId = session.metadata?.user_id;
                const subscriptionId = session.subscription;
                const customerId = session.customer;

                if (userId) {
                    // Retrieve subscription details to get end date
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

                    await supabaseAdmin
                        .from('profiles')
                        .update({
                            stripe_customer_id: customerId,
                            subscription_status: subscription.status,
                            subscription_price_id: subscription.items.data[0].price.id,
                            subscription_end_date: new Date((subscription as any).current_period_end * 1000).toISOString(),
                        })
                        .eq('id', userId);
                }
                break;
            }
            case 'customer.subscription.updated': {
                // Find user by stripe_customer_id since metadata might not be present on subscription update events
                // (though we try to keep it synced, searching by customer_id is safer)
                const subscription = session;
                const customerId = subscription.customer;

                await supabaseAdmin
                    .from('profiles')
                    .update({
                        subscription_status: subscription.status,
                        subscription_price_id: subscription.items.data[0].price.id,
                        subscription_end_date: new Date((subscription as any).current_period_end * 1000).toISOString(),
                    })
                    .eq('stripe_customer_id', customerId);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = session;
                const customerId = subscription.customer;

                await supabaseAdmin
                    .from('profiles')
                    .update({
                        subscription_status: 'canceled', // or subscription.status which should be canceled
                        subscription_end_date: null,
                    })
                    .eq('stripe_customer_id', customerId);
                break;
            }
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        return new NextResponse('Webhook handler failed', { status: 500 });
    }

    return new NextResponse(null, { status: 200 });
}
