import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface CabinItem {
  cabin_number: string;
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

export function CSBSCabinTable() {
  const [items, setItems] = useState<CabinItem[]>([]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("inventory_items")
      .select("cabin_number, name, quantity, item_status")
      .eq("department", "CSBS")
      .not("cabin_number", "is", null)
      .order("cabin_number")
      .order("name");
    if (data) setItems(data as CabinItem[]);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("csbs-table-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (items.length === 0) return null;

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">CSBS Cabin Stock</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cabin Number</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={`${item.cabin_number}-${item.name}-${i}`}>
                  <TableCell className="font-medium">{item.cabin_number}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(item.item_status)}>
                      {item.item_status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
