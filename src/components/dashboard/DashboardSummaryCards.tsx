import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Package, AlertTriangle, Database } from "lucide-react";

interface SummaryData {
  working: number;
  totalItems: number;
  totalDepartments: number;
  lowStockItems: number;
}

async function fetchAllRows(table: "inventory_items", select: string) {
  let allData: any[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data } = await supabase.from(table).select(select).range(from, from + batchSize - 1);
    if (!data || data.length === 0) break;
    allData = [...allData, ...data];
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return allData;
}

export function DashboardSummaryCards() {
  const [data, setData] = useState<SummaryData>({ working: 0, totalItems: 0, totalDepartments: 0, lowStockItems: 0 });

  const fetchData = async () => {
    const items = await fetchAllRows("inventory_items", "quantity, item_status, department, name, low_stock_threshold");

    let working = 0;
    let totalItems = 0;
    const deptSet = new Set<string>();

    // Aggregate by name+department for low stock
    const itemAggregates = new Map<string, { totalQty: number; threshold: number }>();

    items.forEach((item: any) => {
      totalItems += item.quantity;
      if (item.item_status === "working") working += item.quantity;
      deptSet.add(item.department);

      const key = `${item.department}|${item.name}`;
      if (!itemAggregates.has(key)) {
        itemAggregates.set(key, { totalQty: 0, threshold: item.low_stock_threshold || 10 });
      }
      itemAggregates.get(key)!.totalQty += item.quantity;
    });

    let lowStockItems = 0;
    itemAggregates.forEach(agg => {
      if (agg.totalQty <= agg.threshold) lowStockItems++;
    });

    setData({ working, totalItems, totalDepartments: deptSet.size, lowStockItems });
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("summary-cards-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const cards = [
    { title: "Total Items", value: data.totalItems, icon: Package, color: "text-primary" },
    { title: "Working Items", value: data.working, icon: CheckCircle2, color: "text-accent" },
    { title: "Low Stock Items", value: data.lowStockItems, icon: AlertTriangle, color: "text-warning" },
    { title: "Departments", value: data.totalDepartments, icon: Database, color: "text-primary" },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 animate-fade-in">
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
