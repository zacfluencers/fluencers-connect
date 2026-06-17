-- handle_new_user() is SECURITY DEFINER and only ever needs to run from the
-- on_auth_user_created trigger. Revoke direct EXECUTE so it can't be called via
-- the REST API (/rest/v1/rpc/handle_new_user). The trigger still fires normally;
-- trigger invocation doesn't check the EXECUTE privilege.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
