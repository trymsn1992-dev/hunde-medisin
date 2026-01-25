
"use strict";
import React from 'react';
import { cn } from '@/lib/utils';
import { Pill } from 'lucide-react'; // Fallbacks

interface DoseIconProps {
    doseText: string;
    className?: string;
    itemClassName?: string;
}

// SVG Paths

// Tablet (Round with score line)
// viewBox 0 0 24 24
const TabletIcon = ({ percent = 1, className }: { percent?: number, className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        width="24"
        height="24"
        style={{
            clipPath: percent < 1 ? `inset(0 ${100 - (percent * 100)}% 0 0)` : undefined
        }}
    >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M12 4 L12 20" stroke="currentColor" strokeWidth="2" />
    </svg>
);

// Capsule (Two halves)
const CapsuleIcon = ({ percent = 1, className }: { percent?: number, className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        width="24"
        height="24"
        style={{
            clipPath: percent < 1 ? `inset(0 ${100 - (percent * 100)}% 0 0)` : undefined
        }}
    >
        {/* Body */}
        <rect x="6" y="3" width="12" height="18" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
        {/* Center Line for two halves */}
        <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2" />
    </svg>
);

// Liquid / Generic Fallback
const GenericIcon = ({ percent = 1, className }: { percent?: number, className?: string }) => (
    <Pill className={className} />
);

export function DoseIcon({ doseText, className, itemClassName }: DoseIconProps) {
    // 1. Parse text
    const lower = doseText.toLowerCase();

    // Parse amount
    let amount = 1.0;
    const match = lower.match(/^([0-9]+[.,]?[0-9]*)/);
    if (match) {
        amount = parseFloat(match[1].replace(',', '.'));
    }

    // Determine type
    const isCapsule = lower.includes('kap') || lower.includes('caps');
    const isTablet = lower.includes('tab') || lower.includes('pille');
    const isLiquid = lower.includes('ml') || lower.includes('liter');

    // Cap amount to avoid UI explosion (max 5 icons e.g.)
    const displayAmount = Math.min(amount, 5);
    const fullItems = Math.floor(displayAmount);
    const remainder = displayAmount - fullItems; // e.g. 0.5


    const IconComponent = isCapsule ? CapsuleIcon : (isTablet ? TabletIcon : GenericIcon);


    return (
        <div className={cn("flex items-center -space-x-1", className)} title={doseText}>
            {/* Full Icons */}
            {Array.from({ length: fullItems }).map((_, i) => (
                <IconComponent key={`full-${i}`} className={itemClassName} />
            ))}

            {/* Partial Icon */}
            {remainder > 0 && (
                <IconComponent key="partial" percent={remainder} className={itemClassName} />
            )}
        </div>
    );
}
