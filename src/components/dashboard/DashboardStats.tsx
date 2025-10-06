import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingUp, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function DashboardStats() {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    totalDepartments: 6,
    activeAlerts: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [itemsResult, alertsResult] = await Promise.all([
        supabase.from("inventory_items").select("id, quantity, low_stock_threshold"),
        supabase.from("alerts").select("id").eq("is_resolved", false),
      ]);

      const totalItems = itemsResult.data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const lowStockItems = itemsResult.data?.filter(
        item => item.quantity <= item.low_stock_threshold
      ).length || 0;
      const activeAlerts = alertsResult.data?.length || 0;

      setStats({
        totalItems,
        lowStockItems,
        totalDepartments: 6,
        activeAlerts,
      });
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Items",
      value: stats.totalItems.toLocaleString(),
      icon: Package,
      color: "text-primary",
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: "text-warning",
    },
    {
      title: "Departments",
      value: stats.totalDepartments,
      icon: Database,
      color: "text-accent",
    },
    {
      title: "Active Alerts",
      value: stats.activeAlerts,
      icon: TrendingUp,
      color: "text-destructive",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
