import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { priceId, email } = await req.json();

        const session = await stripe.checkout.sessions.create({
            billing_address_collection: 'auto',
            customer_email: email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            subscription_data: {
                trial_period_days: 30, // 1 month free
                metadata: {
                    user_id: user.id,
                },
            },
            metadata: {
                user_id: user.id,
            },
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?subscription=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?subscription=canceled`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
