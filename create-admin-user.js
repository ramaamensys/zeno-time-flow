// Temporary script to create admin user
const response = await fetch('https://usjvqsqotpedesvldkln.supabase.co/functions/v1/create-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzanZxc3FvdHBlZGVzdmxka2xuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNzE1OTksImV4cCI6MjA2ODg0NzU5OX0.EYPESpLvZslYKBiDbMCJAXUTxQOPKMgVURJV9_P0U7E'
  },
  body: JSON.stringify({
    email: 'kuladeepparchuri@gmail.com',
    full_name: 'Kuladeep Parchuri',
    role: 'admin',
    password: 'TempPassword123!'
  })
});

console.log('Response:', await response.json());