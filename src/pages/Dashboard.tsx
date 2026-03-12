import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSummaryCards } from "@/components/dashboard/DashboardSummaryCards";
import { DashboardSearch } from "@/components/dashboard/DashboardSearch";
import { DepartmentCards } from "@/components/dashboard/DepartmentCards";
import { DepartmentStockTable } from "@/components/dashboard/DepartmentStockTable";
import { CSBSCabinTable } from "@/components/dashboard/CSBSCabinTable";
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import { RecentAlerts } from "@/components/dashboard/RecentAlerts";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) navigate("/auth");
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) navigate("/auth");
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
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border border-primary/20">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Welcome back! Here's an overview of your inventory system.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-0" />
        </div>

        <DashboardSearch />

        <DashboardSummaryCards />

        <DepartmentCards />

        <DepartmentStockTable />

        <CSBSCabinTable />

        <RecentActivityTable />

        <RecentAlerts />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
