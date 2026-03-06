CREATE OR REPLACE FUNCTION public.increment_login_count(uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET login_count = COALESCE(login_count, 0) + 1
  WHERE user_id = uid;
END;
$$;