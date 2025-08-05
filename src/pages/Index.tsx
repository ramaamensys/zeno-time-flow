import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckSquare, Calendar, Target, Clock, BarChart3, Users } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="absolute top-4 left-4 flex items-center gap-3 z-10">
        <img src="/lovable-uploads/fa6f8e31-6e31-41cd-932c-1b8fb539d96a.png" alt="Zeno Time Flow - Time Management Platform Logo" className="h-12 w-auto" />
      </header>

      {/* Hero Section */}
      <section className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-4xl mx-auto px-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Master Your Time, <span className="text-primary">Amplify Your Success</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            The ultimate productivity platform that transforms how you manage tasks, schedule events, build habits, and focus. 
            Join thousands who've revolutionized their time management with Zeno Time Flow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link to="/auth">Start Your Journey</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
              <Link to="/auth">See Demo</Link>
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card border">
              <CheckSquare className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Smart Task Management</h3>
              <p className="text-muted-foreground">Organize, prioritize, and track tasks with intelligent categorization, due dates, and progress monitoring.</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card border">
              <Calendar className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Intelligent Calendar</h3>
              <p className="text-muted-foreground">Schedule events seamlessly with multiple views, recurring events, and smart conflict detection.</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card border">
              <Target className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Habit Tracking</h3>
              <p className="text-muted-foreground">Build lasting habits with streak tracking, reminders, and detailed progress analytics.</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card border">
              <Clock className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Focus Timer</h3>
              <p className="text-muted-foreground">Enhance concentration with Pomodoro technique, focus sessions, and distraction blocking.</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card border">
              <BarChart3 className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Analytics & Insights</h3>
              <p className="text-muted-foreground">Track productivity trends, time allocation, and performance metrics with detailed reports.</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card border">
              <Users className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Team Collaboration</h3>
              <p className="text-muted-foreground">Share calendars, assign tasks, and collaborate seamlessly with team members and colleagues.</p>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="mt-20 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">Why Choose Zeno Time Flow?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
              <div>
                <h3 className="text-xl font-semibold mb-3">🚀 Increase Productivity by 40%</h3>
                <p className="text-muted-foreground">Studies show users increase their productivity by an average of 40% within the first month.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">⚡ Save 2+ Hours Daily</h3>
                <p className="text-muted-foreground">Streamlined workflows and smart automation help you reclaim valuable time every day.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">🎯 Achieve Goals Faster</h3>
                <p className="text-muted-foreground">Goal-oriented planning and tracking help you reach objectives 3x faster than traditional methods.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">🧘 Reduce Stress & Overwhelm</h3>
                <p className="text-muted-foreground">Clear organization and mindful planning reduce anxiety and create work-life balance.</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-primary/5 rounded-2xl p-8 border">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Productivity?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Join thousands of professionals who've revolutionized their time management with Zeno Time Flow.
            </p>
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link to="/auth">Get Started Free Today</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;