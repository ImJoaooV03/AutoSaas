/*
  # Fix Infinite Recursion in Users Policy (Final Fix)
  
  1. Creates a SECURITY DEFINER function `get_auth_tenant_id` to safely retrieve
     the current user's tenant_id without triggering RLS policies.
  2. Drops all existing/conflicting policies on the `users` table.
  3. Recreates policies using the new secure function to prevent loops.
*/

-- 1. Create a Secure Function to bypass RLS for tenant lookups
-- SECURITY DEFINER allows this function to run with owner privileges, breaking the loop
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$;

-- 2. Clean up ALL existing policies on 'users' to prevent conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for users in same tenant" ON public.users;
DROP POLICY IF EXISTS "read_own_user" ON public.users;
DROP POLICY IF EXISTS "update_own_user" ON public.users;
-- Also drop policies that might have been created by previous attempts with different names
DROP POLICY IF EXISTS "users_read_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;

-- 3. Recreate Policies using the Secure Function

-- Policy for SELECT: Users can see themselves OR users in their tenant (via secure function)
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (
  auth.uid() = id 
  OR 
  tenant_id = public.get_auth_tenant_id()
);

-- Policy for UPDATE: Users can only update their own record
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id);
