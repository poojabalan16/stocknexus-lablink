import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DepartmentOverview } from "@/components/dashboard/DepartmentOverview";
import { RecentAlerts } from "@/components/dashboard/RecentAlerts";


const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Enhanced Hero Header */}
        <div className="relative overflow-hidden rounded-2xl glass border-primary/10 p-8">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-medium text-accent">Live Dashboard</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-3">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              Welcome back! Here's an overview of your inventory system.
            </p>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-[80px] -z-0" />
          <div className="absolute bottom-0 right-20 w-48 h-48 bg-accent/10 rounded-full blur-[60px] -z-0" />
        </div>

        <DashboardStats />

        <RecentAlerts />

        <DepartmentOverview />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
