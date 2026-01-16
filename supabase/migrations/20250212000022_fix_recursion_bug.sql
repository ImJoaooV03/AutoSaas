/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem: The RLS policies on the 'users' table are querying the 'users' table itself to determine the current user's tenant. This creates an infinite loop.
  2. Solution:
     - Create a `SECURITY DEFINER` function `get_auth_tenant_id()` that bypasses RLS to fetch the tenant_id safely.
     - Update RLS policies on 'users', 'leads', and 'vehicles' to use this function.
*/

-- 1. Create Helper Function (Bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$;

-- 2. Fix 'users' table policies (The source of recursion)
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view members of same tenant" ON public.users;
DROP POLICY IF EXISTS "Enable read access for users in same tenant" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Re-create safe policies for 'users'
CREATE POLICY "Users can view members of same tenant"
ON public.users
FOR SELECT
USING (
  auth.uid() = id -- Always see self
  OR
  tenant_id = public.get_auth_tenant_id() -- See others in same tenant (using safe function)
);

CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id);

-- 3. Optimize 'leads' table policies (Where the error was triggered)
DROP POLICY IF EXISTS "Enable read access for own tenant" ON public.leads;
DROP POLICY IF EXISTS "Enable write access for own tenant" ON public.leads;

CREATE POLICY "Enable read access for own tenant"
ON public.leads
FOR SELECT
USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Enable write access for own tenant"
ON public.leads
FOR ALL
USING (tenant_id = public.get_auth_tenant_id());

-- 4. Optimize 'vehicles' table policies (Authenticated access only)
-- Note: We preserve public access policies if they exist separately
DROP POLICY IF EXISTS "Enable read access for own tenant" ON public.vehicles;
DROP POLICY IF EXISTS "Enable write access for own tenant" ON public.vehicles;

CREATE POLICY "Enable read access for own tenant"
ON public.vehicles
FOR SELECT
TO authenticated
USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Enable write access for own tenant"
ON public.vehicles
FOR ALL
TO authenticated
USING (tenant_id = public.get_auth_tenant_id());

-- 5. Optimize 'tenants' table
DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;
CREATE POLICY "Users can view own tenant"
ON public.tenants
FOR SELECT
USING (id = public.get_auth_tenant_id());
