-- 0003_rate_limit_rpc.sql
-- Atomic upsert-and-increment for rate_limit_hits — design doc §5.4, §10.1.
-- A plain client-side "read count, then write count+1" has a race under
-- concurrent requests (two requests in the same window could both read
-- count=1 and both write count=2, losing a hit). Doing it as a single
-- INSERT ... ON CONFLICT DO UPDATE inside the database is atomic.

create or replace function public.increment_rate_limit(
  p_ip_hash text,
  p_route text,
  p_window_start timestamptz
)
returns int
language plpgsql
security definer
as $$
declare
  new_count int;
begin
  insert into public.rate_limit_hits (ip_hash, route, window_start, count)
  values (p_ip_hash, p_route, p_window_start, 1)
  on conflict (ip_hash, route, window_start)
  do update set count = public.rate_limit_hits.count + 1
  returning count into new_count;

  return new_count;
end;
$$;
