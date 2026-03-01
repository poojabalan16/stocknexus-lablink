import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Package, ArrowRightLeft, Trash2, Wrench, Download } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const LectureBookLookup = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [lectureBookNumbers, setLectureBookNumbers] = useState<string[]>([]);
  const [selectedLBN, setSelectedLBN] = useState<string | null>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [scrapItems, setScrapItems] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLectureBookNumbers();
  }, []);

  const fetchLectureBookNumbers = async () => {
    const { data } = await supabase
      .from("inventory_items")
      .select("lecture_book_number")
      .not("lecture_book_number", "is", null)
      .order("lecture_book_number");

    if (data) {
      const unique = [...new Set(data.map(d => d.lecture_book_number).filter(Boolean))] as string[];
      setLectureBookNumbers(unique);
    }
  };

  const handleSearch = async (lbn: string) => {
    setSelectedLBN(lbn);
    setLoading(true);
    try {
      const [itemsRes, movementsRes, scrapRes, servicesRes] = await Promise.all([
        supabase.from("inventory_items").select("*").eq("lecture_book_number", lbn),
        supabase.from("item_movements").select("*").eq("lecture_book_number", lbn).eq("is_deleted", false).order("movement_date", { ascending: false }),
        supabase.from("scrap_items").select("*").eq("lecture_book_number", lbn),
        supabase.from("inventory_items").select("id").eq("lecture_book_number", lbn).then(async (res) => {
          if (res.data && res.data.length > 0) {
            const ids = res.data.map(i => i.id);
            return supabase.from("services").select("*").in("equipment_id", ids).order("service_date", { ascending: false });
          }
          return { data: [] };
        }),
      ]);

      setInventoryItems(itemsRes.data || []);
      setMovements(movementsRes.data || []);
      setScrapItems(scrapRes.data || []);
      setServices(servicesRes.data || []);
    } catch {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const filteredLBNs = lectureBookNumbers.filter(lbn =>
    lbn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStock = inventoryItems.reduce((sum, i) => sum + i.quantity, 0);
  const deptDistribution = inventoryItems.reduce((acc: Record<string, number>, item) => {
    acc[item.department] = (acc[item.department] || 0) + item.quantity;
    return acc;
  }, {});

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(inventoryItems.map(i => ({
      Name: i.name, Department: i.department, Quantity: i.quantity,
      "Serial Number": i.serial_number, Location: i.location, Status: i.is_working ? "Working" : "Not Working",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `LBN_${selectedLBN}_Report.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Lecture Book Number: ${selectedLBN}`, 14, 20);
    doc.text(`Total Stock: ${totalStock}`, 14, 30);
    autoTable(doc, {
      startY: 40,
      head: [["Name", "Department", "Qty", "Serial No", "Location", "Status"]],
      body: inventoryItems.map(i => [
        i.name, i.department, i.quantity, i.serial_number || "-", i.location || "-", i.is_working ? "Working" : "Not Working",
      ]),
    });
    doc.save(`LBN_${selectedLBN}_Report.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold">Lecture Book Number Lookup</h1>
          <p className="text-muted-foreground">Search and view item details by Lecture Book Number</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Lecture Book Number
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type to search lecture book numbers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {searchQuery && filteredLBNs.length > 0 && (
              <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                {filteredLBNs.map(lbn => (
                  <button
                    key={lbn}
                    className="w-full text-left px-4 py-2 hover:bg-accent text-sm"
                    onClick={() => { setSearchQuery(lbn); handleSearch(lbn); }}
                  >
                    {lbn}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedLBN && !loading && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Results for: {selectedLBN}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportExcel}>
                  <Download className="h-4 w-4 mr-2" />Excel
                </Button>
                <Button variant="outline" size="sm" onClick={exportPDF}>
                  <Download className="h-4 w-4 mr-2" />PDF
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalStock}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Departments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Object.keys(deptDistribution).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Department Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(deptDistribution).map(([dept, qty]) => (
                      <Badge key={dept} variant="outline">{dept}: {String(qty)}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="inventory">
              <TabsList>
                <TabsTrigger value="inventory" className="gap-1"><Package className="h-4 w-4" />Inventory ({inventoryItems.length})</TabsTrigger>
                <TabsTrigger value="movements" className="gap-1"><ArrowRightLeft className="h-4 w-4" />Movements ({movements.length})</TabsTrigger>
                <TabsTrigger value="scrap" className="gap-1"><Trash2 className="h-4 w-4" />Scrap ({scrapItems.length})</TabsTrigger>
                <TabsTrigger value="services" className="gap-1"><Wrench className="h-4 w-4" />Services ({services.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="inventory">
                <Card>
                  <CardContent className="pt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Serial Number</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.department}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell className="font-mono text-sm">{item.serial_number || "-"}</TableCell>
                            <TableCell>{item.location || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={item.is_working ? "default" : "destructive"} className={item.is_working ? "bg-success" : ""}>
                                {item.is_working ? "Working" : "Not Working"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {inventoryItems.length === 0 && (
                          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No inventory items found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="movements">
                <Card>
                  <CardContent className="pt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map(m => (
                          <TableRow key={m.id}>
                            <TableCell>{new Date(m.movement_date).toLocaleDateString()}</TableCell>
                            <TableCell>{m.from_department}</TableCell>
                            <TableCell>{m.to_department}</TableCell>
                            <TableCell>{m.quantity}</TableCell>
                            <TableCell>{m.reason || "-"}</TableCell>
                          </TableRow>
                        ))}
                        {movements.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No movements found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="scrap">
                <Card>
                  <CardContent className="pt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scrapItems.map(s => (
                          <TableRow key={s.id}>
                            <TableCell>{new Date(s.scrapped_at).toLocaleDateString()}</TableCell>
                            <TableCell>{s.department}</TableCell>
                            <TableCell>{s.quantity}</TableCell>
                            <TableCell>{s.reason}</TableCell>
                          </TableRow>
                        ))}
                        {scrapItems.length === 0 && (
                          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No scrap records found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="services">
                <Card>
                  <CardContent className="pt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Technician/Vendor</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {services.map(s => (
                          <TableRow key={s.id}>
                            <TableCell>{new Date(s.service_date).toLocaleDateString()}</TableCell>
                            <TableCell>{s.nature_of_service}</TableCell>
                            <TableCell>{s.technician_vendor_name}</TableCell>
                            <TableCell>₹{s.cost || 0}</TableCell>
                            <TableCell>
                              <Badge variant={s.status === "completed" ? "default" : "outline"} className={s.status === "completed" ? "bg-success" : ""}>
                                {s.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {services.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No service records found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {loading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
      </div>
    </DashboardLayout>
  );
};

export default LectureBookLookup;
