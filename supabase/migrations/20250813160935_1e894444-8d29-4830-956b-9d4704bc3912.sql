-- Create RLS policies for profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile') THEN
        CREATE POLICY "Users can view their own profile"
          ON public.profiles FOR SELECT
          USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile"
          ON public.profiles FOR UPDATE
          USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Super admins can view all profiles') THEN
        CREATE POLICY "Super admins can view all profiles"
          ON public.profiles FOR SELECT
          USING (has_role(auth.uid(), 'super_admin'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Super admins can update all profiles') THEN
        CREATE POLICY "Super admins can update all profiles"
          ON public.profiles FOR UPDATE
          USING (has_role(auth.uid(), 'super_admin'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Super admins can insert profiles') THEN
        CREATE POLICY "Super admins can insert profiles"
          ON public.profiles FOR INSERT
          WITH CHECK (has_role(auth.uid(), 'super_admin'));
    END IF;
END$$;

-- Create RLS policies for user_roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Users can view their own roles') THEN
        CREATE POLICY "Users can view their own roles"
          ON public.user_roles FOR SELECT
          USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Super admins can manage all roles') THEN
        CREATE POLICY "Super admins can manage all roles"
          ON public.user_roles FOR ALL
          USING (has_role(auth.uid(), 'super_admin'));
    END IF;
END$$;

-- Create RLS policies for tasks
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Users can manage their own tasks') THEN
        CREATE POLICY "Users can manage their own tasks"
          ON public.tasks FOR ALL
          USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Super admins can view all tasks') THEN
        CREATE POLICY "Super admins can view all tasks"
          ON public.tasks FOR SELECT
          USING (has_role(auth.uid(), 'super_admin'));
    END IF;
END$$;