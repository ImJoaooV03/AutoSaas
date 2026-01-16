/*
  # Security Fix: Immutable Search Path
  
  Fixes the [WARN] Function Search Path Mutable advisory.
  Sets an explicit search_path for security definer functions to prevent
  schema injection attacks.
*/

-- Fix handle_new_user function (Trigger for new auth users)
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Fix update_updated_at_column (Utility trigger)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
    END IF;
END $$;

-- Fix any other potential functions created in previous steps
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_tenant') THEN
        ALTER FUNCTION public.handle_new_tenant() SET search_path = public;
    END IF;
END $$;
