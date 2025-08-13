import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckSquare } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 left-4 flex items-center gap-3">
        <img src="/lovable-uploads/dfd7bdde-fe82-4a7a-b7bd-d93fa625c987.png" alt="Zeno TimeFlow Logo" className="h-12 w-auto" />
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
          <div className="flex justify-center">
            <div className="flex items-start gap-3 max-w-md">
              <CheckSquare className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Task Management</h3>
                <p className="text-sm text-muted-foreground">Create, organize, and track your tasks with priorities and due dates</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;