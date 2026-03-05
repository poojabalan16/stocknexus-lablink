import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  working: "hsl(142, 76%, 36%)",
  available: "hsl(221, 83%, 30%)",
  under_maintenance: "hsl(38, 92%, 50%)",
  scrap: "hsl(0, 84%, 60%)",
  outdated: "hsl(215, 16%, 47%)",
};

const STATUS_LABELS: Record<string, string> = {
  working: "Working",
  available: "Available",
  under_maintenance: "Maintenance",
  scrap: "Scrap",
  outdated: "Outdated",
};

export function StatusDistributionChart() {
  const [chartData, setChartData] = useState<{ name: string; value: number; key: string }[]>([]);

  const fetchData = async () => {
    const { data } = await supabase.from("inventory_items").select("quantity, item_status");
    if (!data) return;

    const counts: Record<string, number> = {};
    data.forEach((item) => {
      const s = item.item_status || "available";
      counts[s] = (counts[s] || 0) + item.quantity;
    });

    setChartData(
      Object.entries(counts)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({ name: STATUS_LABELS[key] || key, value, key }))
    );
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("status-chart-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Card className="animate-fade-in hover-lift">
      <CardHeader>
        <CardTitle className="text-lg">Stock Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || "#888"} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => value.toLocaleString()} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
