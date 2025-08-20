import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserAppType } from "@/hooks/useUserAppType";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import SchedulerLayout from "@/components/SchedulerLayout";
import AppSelector from "@/pages/AppSelector";

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
import SchedulerUserManagement from "@/pages/scheduler/UserManagement";
import SchedulerSettings from "@/pages/scheduler/Settings";

import NotFound from "@/pages/NotFound";

const AppRouter = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { appType, isLoading: appTypeLoading } = useUserAppType();

  // Show loading while determining app type
  if (authLoading || appTypeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user, show not found (auth should handle redirects)
  if (!user) {
    return <NotFound />;
  }

  // If appType is null, show app selector (admin or multi-app users)
  if (appType === null) {
    return (
      <Routes>
        <Route path="/*" element={
          <ProtectedRoute>
            <Routes>
              <Route index element={<AppSelector />} />
              <Route path="/" element={<AppSelector />} />
              <Route path="/app-selector" element={<AppSelector />} />
              
              {/* Calendar App Routes */}
              <Route path="/calendar" element={<Layout><Calendar /></Layout>} />
              <Route path="/tasks" element={<Layout><Tasks /></Layout>} />
              <Route path="/focus" element={<Layout><Focus /></Layout>} />
              <Route path="/habits" element={<Layout><Habits /></Layout>} />
              <Route path="/user-management" element={<Layout><UserManagement /></Layout>} />
              <Route path="/template" element={<Layout><Template /></Layout>} />
              <Route path="/account" element={<Layout><Account /></Layout>} />
              <Route path="/profile" element={<Layout><Profile /></Layout>} />
              <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
              
              {/* Scheduler App Routes */}
              <Route path="/scheduler" element={
                <SchedulerLayout>
                  <SchedulerDashboard />
                </SchedulerLayout>
              } />
              <Route path="/scheduler/schedule" element={
                <SchedulerLayout>
                  <SchedulerSchedule />
                </SchedulerLayout>
              } />
              <Route path="/scheduler/employees" element={
                <SchedulerLayout>
                  <SchedulerEmployees />
                </SchedulerLayout>
              } />
              <Route path="/scheduler/time-clock" element={
                <SchedulerLayout>
                  <SchedulerTimeClock />
                </SchedulerLayout>
              } />
              <Route path="/scheduler/user-management" element={
                <SchedulerLayout>
                  <SchedulerUserManagement />
                </SchedulerLayout>
              } />
              <Route path="/scheduler/settings" element={
                <SchedulerLayout>
                  <SchedulerSettings />
                </SchedulerLayout>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ProtectedRoute>
        } />
      </Routes>
    );
  }

  // Render scheduler app routes
  if (appType === 'scheduler') {
    return (
      <Routes>
        <Route path="/*" element={
          <ProtectedRoute>
            <SchedulerLayout>
              <Routes>
                <Route path="/" element={<SchedulerDashboard />} />
                <Route path="/scheduler" element={<SchedulerDashboard />} />
                <Route path="/scheduler/schedule" element={<SchedulerSchedule />} />
                <Route path="/scheduler/employees" element={<SchedulerEmployees />} />
                <Route path="/scheduler/time-clock" element={<SchedulerTimeClock />} />
                <Route path="/scheduler/user-management" element={<SchedulerUserManagement />} />
                <Route path="/scheduler/settings" element={<SchedulerSettings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SchedulerLayout>
          </ProtectedRoute>
        } />
      </Routes>
    );
  }

  // Default to calendar app routes
  return (
    <Routes>
      <Route path="/calendar" element={
        <ProtectedRoute>
          <Layout><Calendar /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/tasks" element={
        <ProtectedRoute>
          <Layout><Tasks /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/focus" element={
        <ProtectedRoute>
          <Layout><Focus /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/habits" element={
        <ProtectedRoute>
          <Layout><Habits /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/user-management" element={
        <ProtectedRoute>
          <Layout><UserManagement /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/template" element={
        <ProtectedRoute>
          <Layout><Template /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/account" element={
        <ProtectedRoute>
          <Layout><Account /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Layout><Profile /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRouter;