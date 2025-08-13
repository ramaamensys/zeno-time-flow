-- Create triggers (if they don't exist)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_focus_sessions_updated_at ON public.focus_sessions;
CREATE TRIGGER update_focus_sessions_updated_at
  BEFORE UPDATE ON public.focus_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_tracking_updated_at ON public.time_tracking;
CREATE TRIGGER update_time_tracking_updated_at
  BEFORE UPDATE ON public.time_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.profiles;
CREATE POLICY "Super admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Create RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Create RLS policies for tasks
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
CREATE POLICY "Users can manage their own tasks"
  ON public.tasks FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all tasks" ON public.tasks;
CREATE POLICY "Super admins can view all tasks"
  ON public.tasks FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

-- Create RLS policies for calendar_events
DROP POLICY IF EXISTS "Users can manage their own events" ON public.calendar_events;
CREATE POLICY "Users can manage their own events"
  ON public.calendar_events FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins and managers can view all events" ON public.calendar_events;
CREATE POLICY "Super admins and managers can view all events"
  ON public.calendar_events FOR SELECT
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Super admins can manage all events" ON public.calendar_events;
CREATE POLICY "Super admins can manage all events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can update all events" ON public.calendar_events;
CREATE POLICY "Super admins can update all events"
  ON public.calendar_events FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can delete all events" ON public.calendar_events;
CREATE POLICY "Super admins can delete all events"
  ON public.calendar_events FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'));

-- Create RLS policies for focus_sessions
DROP POLICY IF EXISTS "Users can manage their own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can manage their own focus sessions"
  ON public.focus_sessions FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all focus sessions" ON public.focus_sessions;
CREATE POLICY "Super admins can view all focus sessions"
  ON public.focus_sessions FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

-- Create RLS policies for time_tracking
DROP POLICY IF EXISTS "Users can manage their own time tracking" ON public.time_tracking;
CREATE POLICY "Users can manage their own time tracking"
  ON public.time_tracking FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all time tracking" ON public.time_tracking;
CREATE POLICY "Super admins can view all time tracking"
  ON public.time_tracking FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));