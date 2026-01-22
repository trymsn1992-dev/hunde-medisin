import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import webPush from 'web-push';

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(
        process.env.NEXT_PUBLIC_VAPID_SUBJECT || 'mailto:admin@example.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { dogId, medicineName, status } = await req.json();

        if (status !== 'taken') {
            return NextResponse.json({ message: 'No notification needed' });
        }

        // 1. Get dog name
        const { data: dog } = await supabase.from('dogs').select('name').eq('id', dogId).single();
        if (!dog) return NextResponse.json({ error: 'Dog not found' }, { status: 404 });

        // 2. Get profile for the person who took the action
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        const userName = profile?.full_name || 'Noen';

        // 3. Find other members who want to be notified
        const { data: members } = await supabase
            .from('dog_members')
            .select('user_id')
            .eq('dog_id', dogId)
            .eq('notify_on_dose_taken', true)
            .neq('user_id', user.id);

        const userIds = members?.map(m => m.user_id) || [];
        if (userIds.length === 0) return NextResponse.json({ message: 'No recipients' });

        // 4. Get push subscriptions
        const { data: subscriptions } = await supabase
            .from('push_subscriptions')
            .select('*')
            .in('user_id', userIds);

        if (!subscriptions || subscriptions.length === 0) return NextResponse.json({ message: 'No active subscriptions' });

        const payload = JSON.stringify({
            title: `Medisin gitt: ${dog.name}`,
            body: `${userName} har gitt ${medicineName} til ${dog.name}! ✅`,
        });

        for (const sub of subscriptions) {
            try {
                await webPush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                }, payload);
            } catch (error: any) {
                if (error.statusCode === 410) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                }
            }
        }

        return NextResponse.json({ success: true, count: userIds.length });
    } catch (error) {
        console.error('Notify-taken error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
