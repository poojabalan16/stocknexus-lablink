import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface DeptItem {
  department: string;
  name: string;
  quantity: number;
  item_status: string;
}

const statusVariant = (s: string) => {
  switch (s) {
    case "working": return "default";
    case "scrap": return "destructive";
    case "outdated": return "secondary";
    case "under_maintenance": return "outline";
    default: return "default";
  }
};

export function DepartmentStockTable() {
  const [items, setItems] = useState<DeptItem[]>([]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("inventory_items")
      .select("department, name, quantity, item_status")
      .neq("department", "Main Stock")
      .order("department")
      .order("name");
    if (data) setItems(data);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("dept-table-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">Department Stock</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No items found</TableCell>
                </TableRow>
              ) : (
                items.map((item, i) => (
                  <TableRow key={`${item.department}-${item.name}-${i}`}>
                    <TableCell className="font-medium">{item.department}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.item_status)}>
                        {item.item_status.replace("_", " ")}
                      </Badge>
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
