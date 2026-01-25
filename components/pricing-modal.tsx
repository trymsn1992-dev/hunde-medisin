'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Check } from 'lucide-react';
                        </CardContent >
    <CardFooter>
        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" disabled={loading === 'MONTH'}>
            {loading === 'MONTH' ? 'Laster...' : 'Betal med Vipps'}
        </Button>
    </CardFooter>
                    </Card >

    <Card className="flex flex-col border-2 border-orange-500 bg-orange-50/50 cursor-pointer relative" onClick={() => handleVippsCheckout('YEAR')}>
        <div className="absolute top-0 right-0 bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">
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
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" disabled={loading === 'YEAR'}>
                {loading === 'YEAR' ? 'Laster...' : 'Betal med Vipps'}
            </Button>
        </CardFooter>
    </Card>
                </div >
            </DialogContent >
        </Dialog >
    );
}
