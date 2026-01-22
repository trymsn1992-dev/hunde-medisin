import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import webPush from 'web-push';

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(
        process.env.NEXT_PUBLIC_VAPID_SUBJECT || 'mailto:admin@example.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export async function POST() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: subscriptions } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', user.id);

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ error: 'Ingen aktive varslings-abonnementer funnet på denne brukeren.' }, { status: 404 });
        }

        const payload = JSON.stringify({
            title: 'Test-varsel: Hundemedisin',
            body: 'Dette er et test-varsel for å se hvordan det ser ut på mobilen din! 🐾🔔',
        });

        let sentCount = 0;
        for (const sub of subscriptions) {
            try {
                await webPush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, payload);
                sentCount++;
            } catch (error: any) {
                console.error('Error sending test push', error);
                if (error.statusCode === 410) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                }
            }
        }

        return NextResponse.json({ success: true, sentCount });
    } catch (error) {
        console.error('Test push error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
