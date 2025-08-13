-- Delete all user data except for rama.k@amensys.com
DO $$
DECLARE
    rama_user_id uuid;
BEGIN
    -- Get rama.k@amensys.com user ID
    SELECT id INTO rama_user_id
    FROM auth.users 
    WHERE email = 'rama.k@amensys.com';
    
    -- Delete time tracking data for other users
    DELETE FROM public.time_tracking 
    WHERE user_id != rama_user_id OR user_id IS NULL;
    
    -- Delete focus sessions for other users
    DELETE FROM public.focus_sessions 
    WHERE user_id != rama_user_id OR user_id IS NULL;
    
    -- Delete calendar events for other users
    DELETE FROM public.calendar_events 
    WHERE user_id != rama_user_id OR user_id IS NULL;
    
    -- Delete tasks for other users
    DELETE FROM public.tasks 
    WHERE user_id != rama_user_id OR user_id IS NULL;
    
    -- Delete user roles for other users
    DELETE FROM public.user_roles 
    WHERE user_id != rama_user_id OR user_id IS NULL;
    
    -- Delete profiles for other users
    DELETE FROM public.profiles 
    WHERE user_id != rama_user_id OR user_id IS NULL;
    
    -- Delete auth users except rama.k@amensys.com
    DELETE FROM auth.users 
    WHERE email != 'rama.k@amensys.com';
    
END $$;