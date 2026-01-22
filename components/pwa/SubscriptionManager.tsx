'use client';

import { useState, useEffect } from 'react';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function SubscriptionManager() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [permission, setPermission] = useState<NotificationPermission | 'default'>('default');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
            // 1. Register Service Worker explicitly
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('SW Registered');
                return registration.pushManager.getSubscription();
            }).then(async (sub) => {
                if (sub) {
                    setSubscription(sub);
                    // Sync with backend on mount to ensure DB is up to date
                    try {
                        const res = await fetch('/api/notifications/subscribe', {
                            method: 'POST',
                            body: JSON.stringify(sub),
                            headers: { 'Content-Type': 'application/json' }
                        });
                        if (res.ok) {
                            setIsSubscribed(true);
                        } else {
                            // If backend fails, browser might be out of sync
                            setIsSubscribed(false);
                            console.warn('Backend subscription sync failed on mount');
                        }
                    } catch (e) {
                        console.error('Failed to sync subscription on mount', e);
                    }
                }
            }).catch(err => {
                console.error('SW registration failed', err);
            });
            setPermission(Notification.permission);
        }
    }, []);

    const subscribeUser = async () => {
        setLoading(true);
        try {
            console.log('Starting subscription process...');

            // Explicitly request permission (important for iOS)
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'denied') {
                alert('Du har blokkert varsler. Endre dette i nettleserinnstillingene.');
                return;
            }

            if (result !== 'granted') {
                console.log('Permission not granted:', result);
                return;
            }

            // Get registration
            const registration = await navigator.serviceWorker.ready;
            console.log('SW ready');

            const response = await fetch('/api/notifications/vapid-public-key');
            const { publicKey } = await response.json();
            console.log('VAPID key fetched');

            const convertedVapidKey = urlBase64ToUint8Array(publicKey);

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });
            console.log('Subscribed successfully');

            setSubscription(sub);
            setIsSubscribed(true);

            // Send subscription to backend
            await fetch('/api/notifications/subscribe', {
                method: 'POST',
                body: JSON.stringify(sub),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            alert('Varsler er aktivert!');
        } catch (error) {
            console.error('Subscription error:', error);
            alert('Kunne ikke aktivere varsler. Sjekk konsollen eller prøv igjen.');
        } finally {
            setLoading(false);
        }
    };

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return null; // Not supported
    }

    return (
        <div className="p-4 border rounded-lg bg-gray-50 flex flex-col gap-2">
            <h3 className="font-semibold text-sm text-gray-700">Varslinger</h3>
            <p className="text-xs text-gray-500">
                Få varsel hvis du glemmer en medisin.
            </p>

            {isSubscribed ? (
                <span className="text-green-600 text-sm flex items-center gap-2">
                    ✓ Varsler er på
                </span>
            ) : (
                <button
                    onClick={subscribeUser}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {loading ? 'Oppretter forbindelse...' : 'Skrur på varsler'}
                </button>
            )}
        </div>
    );
}
