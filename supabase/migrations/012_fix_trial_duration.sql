-- ============================================================================
-- FIX TRIAL DURATION
-- Change from 14 days to 7 days (the correct trial policy)
-- ============================================================================

-- Update the trigger function to use 7 days instead of 14
CREATE OR REPLACE FUNCTION public.handle_new_business()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.subscriptions (
        business_id,
        plan,
        status,
        message_limit,
        trial_start,
        trial_end,
        current_period_start,
        current_period_end
    ) VALUES (
        NEW.id,
        'trial',
        'trialing',
        100,
        now(),
        now() + INTERVAL '7 days',
        now(),
        now() + INTERVAL '7 days'
    );
    RETURN NEW;
END;
$$;

-- Fix any existing trials that were created with 14 days
-- Only fix trials that haven't expired yet and were set to > 7 days
UPDATE public.subscriptions
SET
    trial_end = trial_start + INTERVAL '7 days',
    current_period_end = trial_start + INTERVAL '7 days'
WHERE
    status = 'trialing'
    AND trial_start IS NOT NULL
    AND trial_end > trial_start + INTERVAL '7 days';
