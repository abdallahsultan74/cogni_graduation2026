DO $$
DECLARE
  table_record record;
  policy_name text;
BEGIN
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  LOOP
    policy_name := format('%I_deny_all_anon_authenticated', table_record.tablename);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      policy_name,
      table_record.tablename
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      policy_name,
      table_record.tablename
    );
  END LOOP;
END
$$;
