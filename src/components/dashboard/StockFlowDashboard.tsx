import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Package, Warehouse, ArrowRight, Wrench, AlertTriangle, CheckCircle, Archive } from "lucide-react";

interface StockSummary {
  mainStockTotal: number;
  distributedTotal: number;
  departmentBreakdown: { name: string; value: number }[];
  statusBreakdown: { name: string; value: number; color: string }[];
  scrapCount: number;
  workingCount: number;
  outdatedCount: number;
  maintenanceCount: number;
  availableCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  working: "hsl(142, 76%, 36%)",
  available: "hsl(221, 83%, 53%)",
  under_maintenance: "hsl(38, 92%, 50%)",
  outdated: "hsl(0, 84%, 60%)",
  scrap: "hsl(262, 83%, 58%)",
};

const DEPT_COLORS = [
  "hsl(221,83%,30%)", "hsl(142,76%,36%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)",
  "hsl(262,83%,58%)", "hsl(173,58%,39%)", "hsl(330,70%,50%)", "hsl(200,70%,50%)",
  "hsl(60,70%,45%)", "hsl(280,60%,55%)", "hsl(15,80%,50%)", "hsl(190,60%,40%)",
  "hsl(100,50%,45%)", "hsl(240,50%,55%)", "hsl(350,60%,50%)", "hsl(45,80%,50%)",
];

export function StockFlowDashboard() {
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      const [itemsResult, scrapResult] = await Promise.all([
        supabase.from("inventory_items").select("department, quantity, item_status"),
        supabase.from("scrap_items").select("id"),
      ]);

      const items = (itemsResult.data as any[]) || [];
      const mainStockTotal = items.filter(i => i.department === "Main Stock").reduce((s, i) => s + i.quantity, 0);
      const distributed = items.filter(i => i.department !== "Main Stock");
      const distributedTotal = distributed.reduce((s, i) => s + i.quantity, 0);

      // Department breakdown (excluding Main Stock)
      const deptMap = new Map<string, number>();
      distributed.forEach(i => deptMap.set(i.department, (deptMap.get(i.department) || 0) + i.quantity));
      const departmentBreakdown = Array.from(deptMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

      // Status breakdown
      const statusMap = new Map<string, number>();
      items.forEach(i => statusMap.set(i.item_status || "available", (statusMap.get(i.item_status || "available") || 0) + i.quantity));
      const statusBreakdown = Array.from(statusMap.entries()).map(([name, value]) => ({
        name: name.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
        value,
        color: STATUS_COLORS[name] || "hsl(0,0%,60%)",
      }));

      setSummary({
        mainStockTotal,
        distributedTotal,
        departmentBreakdown,
        statusBreakdown,
        scrapCount: scrapResult.data?.length || 0,
        workingCount: statusMap.get("working") || 0,
        outdatedCount: statusMap.get("outdated") || 0,
        maintenanceCount: statusMap.get("under_maintenance") || 0,
        availableCount: statusMap.get("available") || 0,
      });
      setLoading(false);
    };

    fetchSummary();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("stock-flow-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, fetchSummary)
      .on("postgres_changes", { event: "*", schema: "public", table: "distribution_records" }, fetchSummary)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading || !summary) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader><div className="h-4 bg-muted rounded w-1/2" /></CardHeader>
            <CardContent><div className="h-32 bg-muted rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalStock = summary.mainStockTotal + summary.distributedTotal;
  const distributedPercent = totalStock > 0 ? (summary.distributedTotal / totalStock) * 100 : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Stock Flow Overview</h2>

      {/* Flow visualization: Main Stock → Departments → Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover-lift border-primary/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-primary/10"><Warehouse className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Main Stock</p>
                <p className="text-3xl font-bold">{summary.mainStockTotal.toLocaleString()}</p>
              </div>
            </div>
            <Progress value={100 - distributedPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">{(100 - distributedPercent).toFixed(1)}% in central stock</p>
          </CardContent>
        </Card>

        <Card className="hover-lift flex items-center justify-center">
          <CardContent className="pt-6 text-center">
            <ArrowRight className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Distributed</p>
            <p className="text-3xl font-bold text-primary">{summary.distributedTotal.toLocaleString()}</p>
            <Progress value={distributedPercent} className="h-2 mt-3" />
            <p className="text-xs text-muted-foreground mt-2">{distributedPercent.toFixed(1)}% distributed</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-3">Total Across System</p>
            <p className="text-3xl font-bold">{totalStock.toLocaleString()}</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-accent" /> Working</span>
                <span className="font-semibold">{summary.workingCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1"><Package className="h-3 w-3 text-primary" /> Available</span>
                <span className="font-semibold">{summary.availableCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1"><Wrench className="h-3 w-3 text-warning" /> Maintenance</span>
                <span className="font-semibold">{summary.maintenanceCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-destructive" /> Outdated</span>
                <span className="font-semibold">{summary.outdatedCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1"><Archive className="h-3 w-3 text-muted-foreground" /> Scrapped</span>
                <span className="font-semibold">{summary.scrapCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Department Distribution Pie */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle>Department-wise Stock</CardTitle>
            <CardDescription>Distribution of stock across departments</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.departmentBreakdown.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No distributed stock yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={summary.departmentBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {summary.departmentBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={DEPT_COLORS[idx % DEPT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Donut */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle>Stock Status Breakdown</CardTitle>
            <CardDescription>Items classified by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.statusBreakdown.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={summary.statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={3} label>
                    {summary.statusBreakdown.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
