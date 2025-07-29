import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, CheckSquare, Timer, Target } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 left-4 flex items-center gap-3">
        <div className="h-10 w-10 bg-primary rounded flex items-center justify-center">
          <span className="text-white font-bold text-lg">Z</span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight">Zeno Time Flow</span>
        </div>
      </div>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-2xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Manage Your Time, Boost Your Productivity</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Track tasks, schedule events, and focus better with our comprehensive time management platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button asChild size="lg">
              <Link to="/auth">Login</Link>
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
    </div>
  );
};

export default Index;