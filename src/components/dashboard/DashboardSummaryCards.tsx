import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Warehouse, CheckCircle2, XCircle, AlertTriangle, Wrench, TrendingUp } from "lucide-react";

interface SummaryData {
  mainStock: number;
  distributed: number;
  working: number;
  scrap: number;
  outdated: number;
  maintenance: number;
}

async function fetchAllRows(table: string, select: string, filters?: (q: any) => any) {
  let allData: any[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + batchSize - 1);
    if (filters) query = filters(query);
    const { data } = await query;
    if (!data || data.length === 0) break;
    allData = [...allData, ...data];
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return allData;
}

export function DashboardSummaryCards() {
  const [data, setData] = useState<SummaryData>({
    mainStock: 0, distributed: 0, working: 0, scrap: 0, outdated: 0, maintenance: 0,
  });

  const fetchData = async () => {
    const [items, distItems] = await Promise.all([
      fetchAllRows("inventory_items", "quantity, department, item_status"),
      fetchAllRows("distribution_records", "quantity"),
    ]);

    const summary: SummaryData = { mainStock: 0, distributed: 0, working: 0, scrap: 0, outdated: 0, maintenance: 0 };

    items.forEach((item: any) => {
      if (item.department === "Main Stock") summary.mainStock += item.quantity;
      const s = item.item_status;
      if (s === "working") summary.working += item.quantity;
      else if (s === "scrap") summary.scrap += item.quantity;
      else if (s === "outdated") summary.outdated += item.quantity;
      else if (s === "under_maintenance") summary.maintenance += item.quantity;
    });

    summary.distributed = distItems.reduce((s: number, r: any) => s + r.quantity, 0);
    setData(summary);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("summary-cards-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "distribution_records" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const cards = [
    { title: "Total Main Stock", value: data.mainStock, icon: Warehouse, color: "text-primary" },
    { title: "Total Distributed", value: data.distributed, icon: TrendingUp, color: "text-accent" },
    { title: "Working Items", value: data.working, icon: CheckCircle2, color: "text-accent" },
    { title: "Scrap Items", value: data.scrap, icon: XCircle, color: "text-destructive" },
    { title: "Outdated Items", value: data.outdated, icon: AlertTriangle, color: "text-warning" },
    { title: "Under Maintenance", value: data.maintenance, icon: Wrench, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 animate-fade-in">
      {cards.map((c) => (
        <Card key={c.title} className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">{c.title}</CardTitle>
            <c.icon className={`h-4 w-4 ${c.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{c.value.toLocaleString()}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
