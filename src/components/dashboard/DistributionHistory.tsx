import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface DistRecord {
  id: string;
  item_name: string;
  quantity: number;
  to_department: string;
  authorized_person_name: string;
  designation: string;
  distributed_at: string;
  item_status: string;
}

export function DistributionHistory() {
  const [records, setRecords] = useState<DistRecord[]>([]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("distribution_records")
      .select("id, item_name, quantity, to_department, authorized_person_name, designation, distributed_at, item_status")
      .order("distributed_at", { ascending: false })
      .limit(10);
    if (data) setRecords(data);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("dist-history-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "distribution_records" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Card className="animate-fade-in hover-lift">
      <CardHeader>
        <CardTitle className="text-lg">Recent Distribution History</CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No distribution records yet.</p>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border hover:bg-accent/10 transition-colors">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{r.item_name} × {r.quantity}</p>
                  <p className="text-xs text-muted-foreground">
                    To {r.to_department} · By {r.authorized_person_name} ({r.designation})
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="outline" className="text-xs">{r.item_status}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(r.distributed_at), "dd MMM yyyy, HH:mm")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
