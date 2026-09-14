create table public.task_logs (
 user_id uuid primary key references auth.users(id) on delete cascade,
 tasks jsonb not null default '[]'::jsonb check(jsonb_typeof(tasks) = 'array'),
 revision bigint not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.task_logs enable row level security;
revoke all on public.task_logs from public, anon, authenticated;
grant select on public.task_logs to authenticated;
create policy own_task_log on public.task_logs for select to authenticated using ((select auth.uid()) = user_id);

create function public.save_task_log(expected_revision bigint, next_tasks jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 uid uuid := auth.uid();
 saved public.task_logs;
begin
 if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 if expected_revision is null or expected_revision < 0 or next_tasks is null
    or jsonb_typeof(next_tasks) <> 'array' or octet_length(next_tasks::text) > 5000000 then
    raise exception 'Invalid task document' using errcode = '22023';
 end if;
 insert into public.task_logs(user_id) values(uid) on conflict do nothing;
 update public.task_logs set tasks = next_tasks, revision = revision + 1, updated_at = now()
 where user_id = uid and revision = expected_revision returning * into saved;
 if not found then raise exception 'Tasks changed on another device' using errcode = '40001'; end if;
 return jsonb_build_object('tasks', saved.tasks, 'revision', saved.revision);
end;
$$;
revoke all on function public.save_task_log(bigint,jsonb) from public, anon;
grant execute on function public.save_task_log(bigint,jsonb) to authenticated;