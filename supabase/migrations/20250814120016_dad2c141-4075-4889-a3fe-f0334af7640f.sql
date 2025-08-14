-- Create admin user kuladeepparchuri@gmail.com
SELECT auth.create_user(
  json_build_object(
    'email', 'kuladeepparchuri@gmail.com',
    'password', 'TempPassword123!',
    'email_confirm', true,
    'user_metadata', json_build_object(
      'full_name', 'Kuladeep Parchuri'
    )
  )
);