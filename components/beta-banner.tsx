"use client";

import Link from "next/link";
import { MessageSquare, PartyPopper } from "lucide-react";

export function BetaBanner() {
    return (
        <div className="bg-indigo-600 px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex items-center gap-x-2 text-sm font-medium leading-6 text-white text-center w-full sm:w-auto justify-center">
                    <PartyPopper className="h-4 w-4" />
                    <strong className="font-semibold">BETA</strong>
                    <span className="hidden sm:inline mx-1">·</span>
                    <span>Dette er en tidlig versjon av appen.</span>
                </div>
                <div className="flex flex-1 justify-center sm:justify-end">
                    <Link
                        href="https://grinas.typeform.com/hundemedisin"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-full bg-indigo-500 px-3.5 py-1 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 transition-colors"
                    >
                        <MessageSquare className="h-3 w-3" />
                        Gi tilbakemelding
                    </Link>
                </div>
            </div>
        </div>
    );
}
