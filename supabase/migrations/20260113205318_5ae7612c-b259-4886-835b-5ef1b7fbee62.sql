-- Add pinned column to exec_cards table
ALTER TABLE public.exec_cards ADD COLUMN pinned boolean NOT NULL DEFAULT false;