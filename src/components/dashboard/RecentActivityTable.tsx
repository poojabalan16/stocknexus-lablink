import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ActivityRow {
  id: string;
  item_name: string;
  to_department: string;
  quantity: number;
  authorized_person_name: string;
  distributed_at: string;
}

export function RecentActivityTable() {
  const [rows, setRows] = useState<ActivityRow[]>([]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("distribution_records")
      .select("id, item_name, to_department, quantity, authorized_person_name, distributed_at")
      .order("distributed_at", { ascending: false })
      .limit(15);
    if (data) setRows(data);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("activity-table-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "distribution_records" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Qty Distributed</TableHead>
                <TableHead>Authorized Person</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No activity yet</TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.item_name}</TableCell>
                    <TableCell>{r.to_department}</TableCell>
                    <TableCell className="text-right">{r.quantity}</TableCell>
                    <TableCell>{r.authorized_person_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(r.distributed_at), "dd MMM yyyy, HH:mm")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
