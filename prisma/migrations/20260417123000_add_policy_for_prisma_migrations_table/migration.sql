DROP POLICY IF EXISTS "_prisma_migrations_deny_all_anon_authenticated" ON public."_prisma_migrations";

CREATE POLICY "_prisma_migrations_deny_all_anon_authenticated"
ON public."_prisma_migrations"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
