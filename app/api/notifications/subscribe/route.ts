import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    // 1. Authenticate User normally
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const subscription = await req.json();

        // 2. Use Admin Client to bypass RLS for Upsert
        // This allows a new user to "claim" a device endpoint even if it was previously 
        // linked to another user (or previous session) without getting RLS error.
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Use upsert to handle duplicates (e.g. same device, different user or re-install)
        // onConflict: 'endpoint' ensures we just update the user_id/keys if it exists.
        const { error } = await supabaseAdmin.from('push_subscriptions').upsert({
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
        }, { onConflict: 'endpoint' });

        if (error) {
            console.error('STRICT ERROR saving subscription to Supabase:', error);
            return NextResponse.json({ error: 'Database-feil: ' + error.message }, { status: 500 });
        }

        console.log('Subscription upserted successfully for user:', user.id);
        return NextResponse.json({ message: 'Subscribed successfully' });
    } catch (err: any) {
        console.error('Error in subscribe route:', err);
        return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
    }
}
