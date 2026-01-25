
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import webPush from 'web-push';

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(
        process.env.NEXT_PUBLIC_VAPID_SUBJECT || 'mailto:admin@example.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.error("VAPID Keys missing in Test Route");
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Get subscriptions for CURRENT user
        const { data: subscriptions } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', user.id);

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ message: 'No subscriptions found for user' });
        }

        const payload = JSON.stringify({
            title: `Test Notifikasjon 🧪`,
            body: `Dette er en test! Hvis du ser denne, fungerer systemet.`,
        });

        let successCount = 0;
        let errors = [];

        for (const sub of subscriptions) {
            try {
                await webPush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                }, payload);
                successCount++;
            } catch (error: any) {
                console.error('Push Error:', error);
                errors.push(error.message || error);
                if (error.statusCode === 410) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                }
            }
        }

        return NextResponse.json({
            success: true,
            sent: successCount,
            total: subscriptions.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error('Test Route Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
