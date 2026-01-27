
-- Delete all data for non-super_admin users
-- First, get the super_admin user_id
DO $$
DECLARE
  super_admin_id uuid := 'bc6bfc62-1a74-4cbd-9a2f-06d9e91a158a';
BEGIN
  -- Delete employees linked to non-super_admin users
  DELETE FROM public.employees WHERE user_id != super_admin_id AND user_id IS NOT NULL;
  
  -- Delete time_clock entries for deleted employees
  DELETE FROM public.time_clock WHERE employee_id NOT IN (SELECT id FROM public.employees);
  
  -- Delete shifts for deleted employees
  DELETE FROM public.shifts WHERE employee_id NOT IN (SELECT id FROM public.employees) AND employee_id IS NOT NULL;
  
  -- Delete calendar_events for non-super_admin users
  DELETE FROM public.calendar_events WHERE user_id != super_admin_id;
  
  -- Delete habits for non-super_admin users
  DELETE FROM public.habits WHERE user_id != super_admin_id;
  
  -- Delete habit_completions for non-super_admin users
  DELETE FROM public.habit_completions WHERE user_id != super_admin_id;
  
  -- Delete focus_sessions for non-super_admin users
  DELETE FROM public.focus_sessions WHERE user_id != super_admin_id;
  
  -- Delete task_work_sessions for non-super_admin users
  DELETE FROM public.task_work_sessions WHERE user_id != super_admin_id;
  
  -- Delete task_notes for non-super_admin users
  DELETE FROM public.task_notes WHERE user_id != super_admin_id;
  
  -- Delete chat_messages for chats involving non-super_admin users
  DELETE FROM public.chat_messages WHERE chat_id IN (
    SELECT id FROM public.task_chats WHERE user_id != super_admin_id AND admin_id != super_admin_id
  );
  
  -- Delete task_chats for non-super_admin users
  DELETE FROM public.task_chats WHERE user_id != super_admin_id;
  
  -- Delete template_assignments for non-super_admin users
  DELETE FROM public.template_assignments WHERE user_id != super_admin_id;
  
  -- Delete template_tasks for non-super_admin users
  DELETE FROM public.template_tasks WHERE user_id != super_admin_id;
  
  -- Delete location_logs for non-super_admin users
  DELETE FROM public.location_logs WHERE user_id != super_admin_id;
  
  -- Delete app_settings for non-super_admin users
  DELETE FROM public.app_settings WHERE user_id != super_admin_id;
  
  -- Delete user_roles for non-super_admin users
  DELETE FROM public.user_roles WHERE user_id != super_admin_id;
  
  -- Delete profiles for non-super_admin users
  DELETE FROM public.profiles WHERE user_id != super_admin_id;
END $$;
