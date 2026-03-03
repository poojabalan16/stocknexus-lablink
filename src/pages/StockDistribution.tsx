import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Package, Send, History, AlertTriangle } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MainStockItem {
  id: string;
  name: string;
  quantity: number;
  category: string | null;
  item_status: string;
  lecture_book_number: string | null;
}

interface DistributionRecord {
  id: string;
  item_name: string;
  to_department: string;
  quantity: number;
  item_status: string;
  authorized_person_name: string;
  employee_id: string;
  distributed_at: string;
  notes: string | null;
}

const departments = Constants.public.Enums.department.filter(d => d !== "Main Stock");

const statusOptions = [
  { value: "working", label: "Working" },
  { value: "available", label: "Available" },
  { value: "under_maintenance", label: "Under Maintenance" },
  { value: "outdated", label: "Outdated" },
];

const StockDistribution = () => {
  const navigate = useNavigate();
  const [mainStockItems, setMainStockItems] = useState<MainStockItem[]>([]);
  const [distributionHistory, setDistributionHistory] = useState<DistributionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Distribution form state
  const [selectedItemId, setSelectedItemId] = useState("");
  const [toDepartment, setToDepartment] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [itemStatus, setItemStatus] = useState("available");
  const [authorizedName, setAuthorizedName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [designation, setDesignation] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [authDepartment, setAuthDepartment] = useState("");
  const [digitalApproval, setDigitalApproval] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    setUserRole(roles?.role || null);
  };

  const fetchData = async () => {
    setLoading(true);
    const [stockResult, historyResult] = await Promise.all([
      supabase.from("inventory_items").select("id, name, quantity, category, item_status, lecture_book_number").eq("department", "Main Stock" as any).order("name"),
      supabase.from("distribution_records").select("*").order("distributed_at", { ascending: false }).limit(50),
    ]);
    setMainStockItems((stockResult.data as any[]) || []);
    setDistributionHistory((historyResult.data as any[]) || []);
    setLoading(false);
  };

  const selectedItem = mainStockItems.find(i => i.id === selectedItemId);

  const handleDistribute = async () => {
    if (!selectedItem || !toDepartment || !authorizedName || !employeeId || !designation || !contactNumber || !authDepartment) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (!digitalApproval) {
      toast({ title: "Approval Required", description: "Please confirm digital approval.", variant: "destructive" });
      return;
    }
    if (quantity <= 0) {
      toast({ title: "Invalid Quantity", description: "Quantity must be greater than zero.", variant: "destructive" });
      return;
    }
    if (quantity > selectedItem.quantity) {
      toast({ title: "Insufficient Stock", description: `Only ${selectedItem.quantity} units available in Main Stock.`, variant: "destructive" });
      return;
    }

    setDistributing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Reduce main stock
    const { error: updateError } = await supabase.from("inventory_items").update({
      quantity: selectedItem.quantity - quantity,
    }).eq("id", selectedItem.id);

    if (updateError) {
      toast({ title: "Error", description: "Failed to update main stock.", variant: "destructive" });
      setDistributing(false);
      return;
    }

    // 2. Check if item exists in target department, upsert
    const { data: existingItems } = await supabase.from("inventory_items")
      .select("id, quantity")
      .eq("name", selectedItem.name)
      .eq("department", toDepartment as any)
      .limit(1);

    if (existingItems && existingItems.length > 0) {
      await supabase.from("inventory_items").update({
        quantity: existingItems[0].quantity + quantity,
        item_status: itemStatus,
      }).eq("id", existingItems[0].id);
    } else {
      await supabase.from("inventory_items").insert({
        name: selectedItem.name,
        department: toDepartment as any,
        quantity,
        category: selectedItem.category,
        item_status: itemStatus,
        lecture_book_number: selectedItem.lecture_book_number,
        created_by: user.id,
      });
    }

    // 3. Create distribution record
    await supabase.from("distribution_records").insert({
      item_id: selectedItem.id,
      item_name: selectedItem.name,
      from_department: "Main Stock",
      to_department: toDepartment,
      quantity,
      item_status: itemStatus,
      authorized_person_name: authorizedName,
      employee_id: employeeId,
      designation,
      contact_number: contactNumber,
      auth_department: authDepartment,
      digital_approval: digitalApproval,
      distributed_by: user.id,
      notes: notes || null,
    } as any);

    toast({ title: "Stock Distributed", description: `${quantity} units of "${selectedItem.name}" distributed to ${toDepartment}.` });

    // Reset form
    setSelectedItemId("");
    setToDepartment("");
    setQuantity(1);
    setItemStatus("available");
    setDigitalApproval(false);
    setNotes("");
    setDistributing(false);
    fetchData();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const canDistribute = userRole === "admin";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border border-primary/20">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Stock Distribution
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Distribute items from Main Stock to departments
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-0" />
        </div>

        <Tabs defaultValue={canDistribute ? "distribute" : "history"}>
          <TabsList>
            {canDistribute && <TabsTrigger value="distribute">Distribute Stock</TabsTrigger>}
            <TabsTrigger value="main-stock">Main Stock</TabsTrigger>
            <TabsTrigger value="history">Distribution History</TabsTrigger>
          </TabsList>

          {canDistribute && (
            <TabsContent value="distribute">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Item Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Select Item</CardTitle>
                    <CardDescription>Choose an item from Main Stock to distribute</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Item *</Label>
                      <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                        <SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger>
                        <SelectContent>
                          {mainStockItems.filter(i => i.quantity > 0).map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} (Qty: {item.quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedItem && (
                      <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
                        <p className="text-sm"><span className="text-muted-foreground">Available:</span> <span className="font-bold">{selectedItem.quantity}</span></p>
                        <p className="text-sm"><span className="text-muted-foreground">Category:</span> {selectedItem.category || "N/A"}</p>
                        <p className="text-sm"><span className="text-muted-foreground">LBN:</span> {selectedItem.lecture_book_number || "N/A"}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Target Department *</Label>
                      <Select value={toDepartment} onValueChange={setToDepartment}>
                        <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
                        <SelectContent>
                          {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input type="number" min={1} max={selectedItem?.quantity || 1} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 0)} />
                        {selectedItem && quantity > selectedItem.quantity && (
                          <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Exceeds available stock</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Item Status *</Label>
                        <Select value={itemStatus} onValueChange={setItemStatus}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional distribution notes..." />
                    </div>
                  </CardContent>
                </Card>

                {/* Authorized Person */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Authorization Details</CardTitle>
                    <CardDescription>Details of the authorized person performing distribution</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Authorized Person Name *</Label>
                      <Input value={authorizedName} onChange={e => setAuthorizedName(e.target.value)} placeholder="Full name" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Employee ID *</Label>
                        <Input value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="EMP-001" />
                      </div>
                      <div className="space-y-2">
                        <Label>Designation *</Label>
                        <Input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Stock Manager" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Department *</Label>
                        <Select value={authDepartment} onValueChange={setAuthDepartment}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {Constants.public.Enums.department.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Number *</Label>
                        <Input value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 p-4 rounded-lg border bg-muted/50">
                      <Checkbox id="approval" checked={digitalApproval} onCheckedChange={(v) => setDigitalApproval(!!v)} />
                      <label htmlFor="approval" className="text-sm font-medium leading-none cursor-pointer">
                        I confirm this distribution is authorized and approved
                      </label>
                    </div>

                    <Button onClick={handleDistribute} disabled={distributing || !digitalApproval} className="w-full" size="lg">
                      {distributing ? "Distributing..." : "Distribute Stock"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          <TabsContent value="main-stock">
            <Card>
              <CardHeader>
                <CardTitle>Main Stock Inventory</CardTitle>
                <CardDescription>{mainStockItems.length} items in central stock</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>LBN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mainStockItems.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No items in Main Stock</TableCell></TableRow>
                    ) : mainStockItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={item.quantity === 0 ? "destructive" : item.quantity <= 5 ? "secondary" : "default"}>
                            {item.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant="outline">{item.item_status}</Badge></TableCell>
                        <TableCell>{item.lecture_book_number || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Distribution History</CardTitle>
                <CardDescription>Audit trail of all stock distributions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>To Dept</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Authorized By</TableHead>
                      <TableHead>Emp ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distributionHistory.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No distribution records</TableCell></TableRow>
                    ) : distributionHistory.map(rec => (
                      <TableRow key={rec.id}>
                        <TableCell className="text-sm">{new Date(rec.distributed_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{rec.item_name}</TableCell>
                        <TableCell>{rec.to_department}</TableCell>
                        <TableCell><Badge>{rec.quantity}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{rec.item_status}</Badge></TableCell>
                        <TableCell>{rec.authorized_person_name}</TableCell>
                        <TableCell>{rec.employee_id}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default StockDistribution;
