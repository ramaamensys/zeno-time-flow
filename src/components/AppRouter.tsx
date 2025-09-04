import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

// Calendar App Pages
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Calendar from "@/pages/Calendar";
import Focus from "@/pages/Focus";
import Habits from "@/pages/Habits";
import Profile from "@/pages/Profile";
import Account from "@/pages/Account";
import UserManagement from "@/pages/UserManagement";
import Template from "@/pages/Template";

// Scheduler App Pages
import SchedulerDashboard from "@/pages/scheduler/Dashboard";
import SchedulerSchedule from "@/pages/scheduler/Schedule";
import SchedulerEmployees from "@/pages/scheduler/Employees";
import SchedulerTimeClock from "@/pages/scheduler/TimeClock";
import SchedulerSettings from "@/pages/scheduler/Settings";

import NotFound from "@/pages/NotFound";

const AppRouter = () => {
  const { user, isLoading: authLoading } = useAuth();

  // Show loading while determining authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user, return nothing to let App.tsx routes handle it
  if (!user) {
    return null;
  }

  // Unified app with all features
  return (
    <Routes>
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/focus" element={<Focus />} />
              <Route path="/habits" element={<Habits />} />
              <Route path="/user-management" element={<UserManagement />} />
              <Route path="/template" element={<Template />} />
              <Route path="/account" element={<Account />} />
              <Route path="/profile" element={<Profile />} />
              
              {/* Scheduler Features */}
              <Route path="/scheduler" element={<SchedulerDashboard />} />
              <Route path="/scheduler/schedule" element={<SchedulerSchedule />} />
              <Route path="/scheduler/employees" element={<SchedulerEmployees />} />
              <Route path="/scheduler/time-clock" element={<SchedulerTimeClock />} />
              <Route path="/scheduler/settings" element={<SchedulerSettings />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

export default AppRouter;