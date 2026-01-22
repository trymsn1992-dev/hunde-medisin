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

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
            // 1. Register Service Worker
            navigator.serviceWorker.ready.then(registration => {
                registration.pushManager.getSubscription().then(sub => {
                    if (sub) {
                        setSubscription(sub);
                        setIsSubscribed(true);
                    }
                });
            });
            setPermission(Notification.permission);
        }
    }, []);

    const subscribeUser = async () => {
        try {
            if (permission === 'denied') {
                alert('Du har blokkert varsler. Endre dette i nettleserinnstillingene.');
                return;
            }

            const registration = await navigator.serviceWorker.ready;

            const response = await fetch('/api/notifications/vapid-public-key');
            const { publicKey } = await response.json();

            const convertedVapidKey = urlBase64ToUint8Array(publicKey);

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

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
            alert('Kunne ikke aktivere varsler. Sjekk konsollen.');
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
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition"
                >
                    Skrur på varsler
                </button>
            )}
        </div>
    );
}
