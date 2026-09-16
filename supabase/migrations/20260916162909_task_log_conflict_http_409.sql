-- A stale document is an application conflict, not a retryable serialization failure.
create or replace function public.save_task_log(expected_revision bigint, next_tasks jsonb)
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
 if not found then raise exception 'Tasks changed on another device' using errcode = 'PT409'; end if;
 return jsonb_build_object('tasks', saved.tasks, 'revision', saved.revision);
end;
$$;
revoke all on function public.save_task_log(bigint,jsonb) from public, anon;
grant execute on function public.save_task_log(bigint,jsonb) to authenticated;
