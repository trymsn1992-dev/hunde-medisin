-- Migration: Add paused_at column to medication_plans
alter table public.medication_plans add column paused_at timestamp with time zone;
