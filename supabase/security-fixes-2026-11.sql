-- supabase/security-fixes-2026-11.sql
-- Tightens Row Level Security. Run once in Supabase → SQL Editor.
-- Everything runs in one transaction: if any statement fails, nothing changes.
--
-- Requests from the API routes use the service_role key and are not affected.
-- Statements you run yourself in the SQL editor (as postgres) are not affected.

begin;

-- ════════════════════════════════════════════════════════════════
-- 1. PROFILES — users could change their own role / school
--    ("Users can update own profile" had no column limit, so a teacher or
--     parent could set role = 'super_admin' or 'platform_admin').
-- ════════════════════════════════════════════════════════════════

create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  -- Only requests coming from logged-in browser users are restricted
  if current_user not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    raise exception 'Profiles can only be created by the server';
  end if;

  if new.id         is distinct from old.id
  or new.role       is distinct from old.role
  or new.school_id  is distinct from old.school_id
  or new.email      is distinct from old.email
  or new.student_id is distinct from old.student_id then
    raise exception 'Only the name of a profile can be changed here';
  end if;

  return new;
end $$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before insert or update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Admins never edit other profiles from the browser (deletes go through
-- /api/delete-user with the service key), so this broad policy is removed.
drop policy if exists "admin manage profiles" on public.profiles;

-- Parents could list every staff member and parent of the school (emails…)
drop policy if exists "same school" on public.profiles;
drop policy if exists "same school staff" on public.profiles;
create policy "same school staff" on public.profiles
  for select using (
    school_id = get_my_school_id()
    and get_my_role() = any (array['super_admin', 'admin', 'teacher'])
  );
-- ("users can read own profile" stays: everyone can read their own row)


-- ════════════════════════════════════════════════════════════════
-- 2. STUDENTS — any parent could read every student of the school
--    (names, Massar codes, birth dates, parents' phones/emails). Massar code +
--    birth date is exactly what parent self-registration asks for.
--    Parents could also edit their child's row (name, group, school…).
-- ════════════════════════════════════════════════════════════════

drop policy if exists "same school students"                on public.students;
drop policy if exists "school can read own students"        on public.students;
drop policy if exists "parent can update own invite status" on public.students;
drop policy if exists "read students"                       on public.students;

create policy "read students" on public.students
  for select using (
    (school_id = get_my_school_id()
       and get_my_role() = any (array['super_admin', 'admin', 'teacher']))
    or get_my_role() = 'platform_admin'
    or parent_email = auth.email()
  );
-- ("admin manage students" stays as it is)


-- ════════════════════════════════════════════════════════════════
-- 3. ATTENDANCE — parents could read the attendance of the whole school;
--    teachers could insert rows for students of other schools.
-- ════════════════════════════════════════════════════════════════

drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select" on public.attendance
  for select using (
    (student_school_id(student_id) = get_my_school_id()
       and get_my_role() = any (array['super_admin', 'admin', 'teacher']))
    or get_my_role() = 'platform_admin'
    or is_my_child(student_id)
  );

drop policy if exists "teacher mark attendance" on public.attendance;
create policy "teacher mark attendance" on public.attendance
  for insert with check (
    exists (
      select 1 from class_sessions cs
      join teacher_planning tp on tp.id = cs.planning_id
      where cs.id = attendance.session_id and tp.teacher_id = auth.uid()
    )
    and student_school_id(student_id) = get_my_school_id()
  );

-- Duplicate of "teacher update attendance"
drop policy if exists "teacher update own attendance" on public.attendance;


-- ════════════════════════════════════════════════════════════════
-- 4. TEACHER_PLANNING — anyone in the school (teacher or parent) could
--    delete any planning slot, which also deletes its sessions and attendance.
--    "admin manage planning" already lets admins delete.
-- ════════════════════════════════════════════════════════════════

drop policy if exists "admin can delete planning" on public.teacher_planning;


-- ════════════════════════════════════════════════════════════════
-- 5. SCHOOLS — anyone in the school (even a parent) could update the school,
--    including status / trial_ends_at / paid_until (skip the subscription).
-- ════════════════════════════════════════════════════════════════

drop policy if exists "admin can update their school" on public.schools;
create policy "admin can update their school" on public.schools
  for update
  using      (id = get_my_school_id() and get_my_role() = any (array['super_admin', 'admin']))
  with check (id = get_my_school_id() and get_my_role() = any (array['super_admin', 'admin']));

create or replace function public.protect_school_billing()
returns trigger language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if get_my_role() = 'platform_admin' then return new; end if;

  if new.status        is distinct from old.status
  or new.trial_ends_at is distinct from old.trial_ends_at
  or new.paid_until    is distinct from old.paid_until
  or new.plan          is distinct from old.plan then
    raise exception 'Only the platform admin can change the subscription';
  end if;
  return new;
end $$;

drop trigger if exists protect_school_billing on public.schools;
create trigger protect_school_billing
  before update on public.schools
  for each row execute function public.protect_school_billing();


-- ════════════════════════════════════════════════════════════════
-- 6. INVITATIONS — any teacher or parent could read the school's pending
--    invitation tokens (and accept an admin invite themselves) or create an
--    admin invitation for their own email.
-- ════════════════════════════════════════════════════════════════

drop policy if exists "Users can delete own school invitations" on public.invitations;
drop policy if exists "Users can insert own school invitations" on public.invitations;
drop policy if exists "Users can view own school invitations"   on public.invitations;

-- Admins may only create teacher invitations; directors admin or teacher
drop policy if exists "admin manage invitations" on public.invitations;
create policy "admin manage invitations" on public.invitations
  for all
  using (
    school_id = get_my_school_id()
    and get_my_role() = any (array['super_admin', 'admin'])
  )
  with check (
    school_id = get_my_school_id()
    and role in ('admin', 'teacher')
    and (get_my_role() = 'super_admin' or (get_my_role() = 'admin' and role = 'teacher'))
  );


-- ════════════════════════════════════════════════════════════════
-- 7. INVITATION_QUEUE — no longer used by the app; only the server may touch it
-- ════════════════════════════════════════════════════════════════

drop policy if exists "school manage own queue" on public.invitation_queue;

commit;
