'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Check } from 'lucide-react';

export function PricingModal({
    trigger,
    email,
}: {
    trigger?: React.ReactNode;
    email: string;
}) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleCheckout = async (priceId: string) => {
        setLoading(priceId);
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceId, email }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error('No checkout URL');
            }
        } catch (error) {
            console.error('Checkout error:', error);
        } finally {
            setLoading(null);
        }
    };

    const PRICE_ID_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY;
    const PRICE_ID_YEARLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY;

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || <Button variant="default">Oppgrader til Premium</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">Velg abonnement</DialogTitle>
                    <DialogDescription className="text-center">
                        Prøv gratis i 30 dager. Ingen bindingstid.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <Card className="flex flex-col border-2 hover:border-blue-500 transition-colors cursor-pointer relative" onClick={() => handleCheckout(PRICE_ID_MONTHLY!)}>
                        <div className="absolute top-0 right-0 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-bl-lg">
                            Mest fleksibel
                        </div>
                        <CardHeader>
                            <CardTitle>Månedlig</CardTitle>
                            <CardDescription>Betal hver måned</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <div className="text-3xl font-bold mb-4">10 kr<span className="text-sm font-normal text-muted-foreground">/mnd</span></div>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> 1 måned gratis</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Ubegrenset hunder</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Varsling til alle</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" disabled={loading === PRICE_ID_MONTHLY}>
                                {loading === PRICE_ID_MONTHLY ? 'Laster...' : 'Velg Månedlig'}
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="flex flex-col border-2 border-blue-500 bg-blue-50/50 cursor-pointer relative" onClick={() => handleCheckout(PRICE_ID_YEARLY!)}>
                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">
                            Spar 17%
                        </div>
                        <CardHeader>
                            <CardTitle>Årlig</CardTitle>
                            <CardDescription>Betal en gang i året</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <div className="text-3xl font-bold mb-4">100 kr<span className="text-sm font-normal text-muted-foreground">/år</span></div>
                            <p className="text-xs text-muted-foreground mb-4">Tilsvarer 8.33 kr/mnd</p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> 1 måned gratis</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Alle premium funksjoner</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" variant="default" disabled={loading === PRICE_ID_YEARLY}>
                                {loading === PRICE_ID_YEARLY ? 'Laster...' : 'Velg Årlig'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
