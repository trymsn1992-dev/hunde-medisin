import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const subscription = await req.json();

        // Check if subscription already exists
        const { data: existing } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('endpoint', subscription.endpoint)
            .single();

        if (existing) {
            // Setup successful, already exists
            return NextResponse.json({ message: 'Already subscribed' });
        }

        const { error } = await supabase.from('push_subscriptions').insert({
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
        });

        if (error) {
            console.error('STRICT ERROR saving subscription to Supabase:', error);
            return NextResponse.json({ error: 'Database-feil: ' + error.message }, { status: 500 });
        }

        console.log('New subscription saved successfully for user:', user.id);
        return NextResponse.json({ message: 'Subscribed successfully' });
    } catch (err) {
        console.error('Error in subscribe route:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
