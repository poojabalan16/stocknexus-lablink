import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DoorOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CabinData {
  cabin: string;
  total: number;
  working: number;
  scrap: number;
}

export function CSBSCabinStock() {
  const [cabins, setCabins] = useState<CabinData[]>([]);
  const [maxTotal, setMaxTotal] = useState(1);

  const fetchData = async () => {
    const { data } = await supabase
      .from("inventory_items")
      .select("cabin_number, quantity, item_status")
      .eq("department", "CSBS")
      .not("cabin_number", "is", null);

    if (!data) return;

    const cabinMap = new Map<string, CabinData>();
    data.forEach((item) => {
      const cabin = item.cabin_number!;
      if (!cabinMap.has(cabin)) {
        cabinMap.set(cabin, { cabin, total: 0, working: 0, scrap: 0 });
      }
      const c = cabinMap.get(cabin)!;
      c.total += item.quantity;
      if (item.item_status === "working") c.working += item.quantity;
      if (item.item_status === "scrap") c.scrap += item.quantity;
    });

    const sorted = Array.from(cabinMap.values()).sort((a, b) => a.cabin.localeCompare(b.cabin, undefined, { numeric: true }));
    setMaxTotal(Math.max(...sorted.map((c) => c.total), 1));
    setCabins(sorted);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("csbs-cabin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (cabins.length === 0) return null;

  return (
    <Card className="animate-fade-in hover-lift">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DoorOpen className="h-5 w-5 text-primary" />
          CSBS Cabin-wise Stock
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {cabins.map((c) => (
            <div key={c.cabin} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{c.cabin}</span>
                <span className="text-muted-foreground">
                  {c.total} items · {c.working} working · {c.scrap} scrap
                </span>
              </div>
              <Progress value={(c.total / maxTotal) * 100} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
