"use client";

import Link from "next/link";
import { MessageSquare, PartyPopper } from "lucide-react";

export function BetaBanner() {
    return (
        <div className="bg-blue-50/50 px-4 py-2 sm:px-6 lg:px-8 border-b border-blue-100/50">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex items-center gap-x-2 text-xs font-medium leading-6 text-blue-900 text-center w-full sm:w-auto justify-center">
                    <PartyPopper className="h-3.5 w-3.5 text-blue-500" />
                    <strong className="font-semibold text-blue-700">BETA</strong>
                    <span className="hidden sm:inline mx-1 text-blue-300">·</span>
                    <span className="opacity-80">Tidlig versjon.</span>
                </div>
                <div className="flex flex-1 justify-center sm:justify-end">
                    <Link
                        href="https://grinas.typeform.com/hundemedisin"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-full bg-white border border-blue-100 px-3 py-0.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50 transition-colors"
                    >
                        <MessageSquare className="h-3 w-3" />
                        Gi tilbakemelding
                    </Link>
                </div>
            </div>
        </div>
    );
}
