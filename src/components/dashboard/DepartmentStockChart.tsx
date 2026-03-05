import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function DepartmentStockChart() {
  const [chartData, setChartData] = useState<{ name: string; total: number }[]>([]);

  const fetchData = async () => {
    const { data } = await supabase.from("inventory_items").select("department, quantity");
    if (!data) return;

    const deptMap = new Map<string, number>();
    data.forEach((item) => {
      if (item.department === "Main Stock") return;
      deptMap.set(item.department, (deptMap.get(item.department) || 0) + item.quantity);
    });

    setChartData(
      Array.from(deptMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, total]) => ({ name, total }))
    );
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("dept-chart-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Card className="animate-fade-in hover-lift">
      <CardHeader>
        <CardTitle className="text-lg">Department-wise Stock</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
            <Tooltip formatter={(value: number) => value.toLocaleString()} />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
