import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Warehouse, ArrowDown, Building2, ArrowDown as ArrowDown2, CheckCircle2, AlertTriangle, XCircle, Wrench } from "lucide-react";

interface FlowData {
  mainStockTotal: number;
  distributedTotal: number;
  departmentCount: number;
  statusCounts: {
    working: number;
    scrap: number;
    outdated: number;
    under_maintenance: number;
    available: number;
  };
}

export function StockFlowVisualization() {
  const [data, setData] = useState<FlowData>({
    mainStockTotal: 0,
    distributedTotal: 0,
    departmentCount: 0,
    statusCounts: { working: 0, scrap: 0, outdated: 0, under_maintenance: 0, available: 0 },
  });

  const fetchData = async () => {
    const [mainStockRes, allItemsRes, distributionRes] = await Promise.all([
      supabase.from("inventory_items").select("quantity").eq("department", "Main Stock"),
      supabase.from("inventory_items").select("quantity, department, item_status"),
      supabase.from("distribution_records").select("quantity"),
    ]);

    const mainStockTotal = mainStockRes.data?.reduce((s, i) => s + i.quantity, 0) || 0;
    const distributedTotal = distributionRes.data?.reduce((s, i) => s + i.quantity, 0) || 0;

    const departments = new Set<string>();
    const statusCounts = { working: 0, scrap: 0, outdated: 0, under_maintenance: 0, available: 0 };

    allItemsRes.data?.forEach((item) => {
      if (item.department !== "Main Stock") departments.add(item.department);
      const status = item.item_status as keyof typeof statusCounts;
      if (status in statusCounts) {
        statusCounts[status] += item.quantity;
      }
    });

    setData({ mainStockTotal, distributedTotal, departmentCount: departments.size, statusCounts });
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("stock-flow-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "distribution_records" }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const statusItems = [
    { label: "Working", count: data.statusCounts.working, icon: CheckCircle2, color: "text-accent" },
    { label: "Available", count: data.statusCounts.available, icon: CheckCircle2, color: "text-primary" },
    { label: "Under Maintenance", count: data.statusCounts.under_maintenance, icon: Wrench, color: "text-warning" },
    { label: "Scrap", count: data.statusCounts.scrap, icon: XCircle, color: "text-destructive" },
    { label: "Outdated", count: data.statusCounts.outdated, icon: AlertTriangle, color: "text-muted-foreground" },
  ];

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-xl">Stock Flow Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-2">
          {/* Main Stock */}
          <div className="w-full max-w-xs p-4 rounded-xl border-2 border-primary/30 bg-primary/5 text-center">
            <Warehouse className="h-8 w-8 mx-auto text-primary mb-1" />
            <p className="text-sm font-medium text-muted-foreground">Main Stock</p>
            <p className="text-3xl font-bold text-primary">{data.mainStockTotal.toLocaleString()}</p>
          </div>

          <ArrowDown className="h-6 w-6 text-primary animate-bounce" />

          {/* Distributed */}
          <div className="w-full max-w-xs p-4 rounded-xl border-2 border-accent/30 bg-accent/5 text-center">
            <Building2 className="h-8 w-8 mx-auto text-accent mb-1" />
            <p className="text-sm font-medium text-muted-foreground">
              Distributed to {data.departmentCount} Departments
            </p>
            <p className="text-3xl font-bold text-accent">{data.distributedTotal.toLocaleString()}</p>
          </div>

          <ArrowDown className="h-6 w-6 text-muted-foreground" />

          {/* Status Breakdown */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {statusItems.map((s) => (
              <div key={s.label} className="p-3 rounded-lg border bg-card text-center hover-lift">
                <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.count.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
