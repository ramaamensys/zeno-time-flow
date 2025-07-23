import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, CheckSquare, Timer, Target } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-3xl font-bold">
            <Timer className="h-8 w-8 text-primary" />
            TimeFlow
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4">Manage Your Time, Boost Your Productivity</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Track tasks, schedule events, and focus better with our comprehensive time management platform
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button asChild size="lg">
            <Link to="/auth">Get Started</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="flex items-start gap-3">
            <CheckSquare className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold mb-2">Task Management</h3>
              <p className="text-sm text-muted-foreground">Create, organize, and track your tasks with priorities and due dates</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold mb-2">Calendar Integration</h3>
              <p className="text-sm text-muted-foreground">Schedule events and manage your time effectively</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Target className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold mb-2">Focus Sessions</h3>
              <p className="text-sm text-muted-foreground">Track focused work time and measure productivity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
