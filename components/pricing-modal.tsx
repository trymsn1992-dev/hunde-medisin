'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PricingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PricingModal({ open, onOpenChange }: PricingModalProps) {
    const [loading, setLoading] = useState<'MONTH' | 'YEAR' | null>(null);

    const handleCheckout = async (interval: 'MONTH' | 'YEAR') => {
        setLoading(interval);
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interval })
            });
            const data = await res.json();
            if (data.sessionId) {
                const stripe = await stripePromise;
                await (stripe as any)?.redirectToCheckout({ sessionId: data.sessionId });
            } else {
                alert("Feil ved oppstart av betaling");
            }
        } catch (error) {
            console.error(error);
            alert("Noe gikk galt");
        } finally {
            setLoading(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Oppgrader til Premium 🌟</DialogTitle>
                    <DialogDescription>
                        Få tilgang til ubegrenset antall hunder, helselogg og mer.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    {/* MONTHLY */}
                    <Card className="flex flex-col cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleCheckout('MONTH')}>
                        <CardHeader>
                            <CardTitle>Månedlig</CardTitle>
                            <CardDescription>Fleksibelt, avslutt når som helst</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <div className="text-3xl font-bold mb-4">49 kr<span className="text-sm font-normal text-muted-foreground">/mnd</span></div>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Alle funksjoner</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Ingen bindingstid</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" variant="outline" disabled={loading === 'MONTH'}>
                                {loading === 'MONTH' ? 'Laster...' : 'Velg Månedlig'}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* YEARLY */}
                    <Card className="flex flex-col border-2 border-primary bg-primary/5 cursor-pointer relative" onClick={() => handleCheckout('YEAR')}>
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-bl-lg">
                            Spar 17%
                        </div>
                        <CardHeader>
                            <CardTitle>Årlig</CardTitle>
                            <CardDescription>Betal en gang i året</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <div className="text-3xl font-bold mb-4">499 kr<span className="text-sm font-normal text-muted-foreground">/år</span></div>
                            <p className="text-xs text-muted-foreground mb-4">Tilsvarer ca 41 kr/mnd</p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> 2 måneder gratis</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Alle funksjoner</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" disabled={loading === 'YEAR'}>
                                {loading === 'YEAR' ? 'Laster...' : 'Velg Årlig'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
