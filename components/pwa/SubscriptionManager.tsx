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
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hasSW = 'serviceWorker' in navigator;
            const hasPush = 'PushManager' in window;
            if (!hasSW || !hasPush) {
                setIsSupported(false);
                return;
            }

            // 1. Register Service Worker explicitly
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('SW Registered');
                return registration.pushManager.getSubscription();
            }).then(async (sub) => {
                if (sub) {
                    console.log('Found existing subscription, syncing...');
                    setSubscription(sub);
                    // Sync with backend on mount
                    try {
                        const res = await fetch('/api/notifications/subscribe', {
                            method: 'POST',
                            body: JSON.stringify(sub.toJSON()),
                            headers: { 'Content-Type': 'application/json' }
                        });
                        if (res.ok) {
                            setIsSubscribed(true);
                            console.log('Subscription synced successfully');
                        } else {
                            setIsSubscribed(false);
                            console.warn('Sync failed:', await res.text());
                        }
                    } catch (e) {
                        console.error('Failed to sync on mount', e);
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
            const data = await response.json();

            if (!data.publicKey) {
                throw new Error("VAPID public key not found from server");
            }
            const { publicKey } = data;
            console.log('VAPID key fetched');

            const convertedVapidKey = urlBase64ToUint8Array(publicKey);

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });
            console.log('Browser subscribed successfully');

            const subJSON = sub.toJSON();
            console.log('Subscription JSON:', subJSON);

            setSubscription(sub);

            // Send subscription to backend
            const syncRes = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                body: JSON.stringify(subJSON),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (syncRes.ok) {
                setIsSubscribed(true);
                alert('Varsler er aktivert og lagret! Prøv test-knappen nå.');
            } else {
                const errorData = await syncRes.json();
                throw new Error(errorData.error || 'Serveren nektet å lagre varslings-ID.');
            }
        } catch (error: any) {
            console.error('Subscription error:', error);
            alert('Feil ved aktivering: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isSupported) {
        return (
            <div className="p-4 border rounded-lg bg-yellow-50 flex flex-col gap-2">
                <h3 className="font-semibold text-sm text-yellow-800">Varslinger ikke tilgjengelig</h3>
                <p className="text-xs text-yellow-700">
                    Nettleseren din støtter ikke varslinger, eller du besøker siden via en usikker tilkobling (ikke HTTPS/localhost).
                </p>
            </div>
        )
    }

    return (
        <div className="p-4 border rounded-lg bg-gray-50 flex flex-col gap-2">
            <h3 className="font-semibold text-sm text-gray-700">Varslinger</h3>
            <p className="text-xs text-gray-500">
                Få varsel hvis du glemmer en medisin.
            </p>

            {isSubscribed ? (
                <div className="flex flex-col gap-2">
                    <span className="text-green-600 text-sm flex items-center gap-2">
                        ✓ Varsler er på
                    </span>
                    <button
                        onClick={async () => {
                            setLoading(true);
                            try {
                                const res = await fetch('/api/notifications/test', { method: 'POST' });
                                const data = await res.json();
                                if (data.success && data.sent > 0) alert("Test sendt! Sjekk varslingssenteret.");
                                else alert("Kunne ikke sende test: " + (data.message || data.error || JSON.stringify(data)));
                            } catch (e: any) {
                                alert("Feil: " + e.message);
                            } finally {
                                setLoading(false);
                            }
                        }}
                        disabled={loading}
                        className="text-xs bg-muted border p-1 rounded hover:bg-muted/80 w-full"
                    >
                        {loading ? 'Sender...' : 'Send test-varsel'}
                    </button>
                    <button
                        onClick={async () => {
                            // Simple unsubscribe logic if needed, or just let them stay subscribed
                            // For debugging, useful to have "Reset"
                            if (confirm("Vil du nullstille varsling på denne enheten?")) {
                                const reg = await navigator.serviceWorker.ready;
                                const sub = await reg.pushManager.getSubscription();
                                if (sub) await sub.unsubscribe();
                                setIsSubscribed(false);
                                setSubscription(null);
                            }
                        }}
                        className="text-[10px] text-muted-foreground hover:underline self-start"
                    >
                        Nullstill varsler
                    </button>
                </div>
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
