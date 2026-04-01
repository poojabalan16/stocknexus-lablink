import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Package, UserCheck, Upload, AlertTriangle, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";

interface MainStockItem {
  name: string;
  totalQty: number;
}

interface BulkRow {
  item_name: string;
  quantity: number;
  department: string;
  ledger_book?: string;
  cabin_number?: string;
  valid: boolean;
  error?: string;
}

const departments = Constants.public.Enums.department.filter(d => d !== "Main Stock");
const cabinNumbers = ["Cabin 101", "Cabin 102", "Cabin 103", "Cabin 104"];

const StockDistribution = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mainStockItems, setMainStockItems] = useState<MainStockItem[]>([]);
  const [activeTab, setActiveTab] = useState<"manual" | "bulk">("manual");

  // Manual distribution fields
  const [selectedItem, setSelectedItem] = useState("");
  const [availableQty, setAvailableQty] = useState(0);
  const [distributeQty, setDistributeQty] = useState(1);
  const [department, setDepartment] = useState("");
  const [cabinNumber, setCabinNumber] = useState("");
  const [itemStatus, setItemStatus] = useState("available");
  const [notes, setNotes] = useState("");

  // Authorized person
  const [personName, setPersonName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [authDept, setAuthDept] = useState("");
  const [designation, setDesignation] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [approved, setApproved] = useState(false);

  // File upload
  const [file, setFile] = useState<File | null>(null);

  // Bulk import
  const [bulkData, setBulkData] = useState<BulkRow[]>([]);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<{ success: number; failed: number } | null>(null);

  useEffect(() => {
    checkAuth();
    fetchMainStockItems();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    if (!roles || roles.role !== "admin") {
      toast.error("Only admins can distribute stock");
      navigate("/dashboard");
    }
  };

  const fetchMainStockItems = async () => {
    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data } = await supabase
        .from("inventory_items")
        .select("name, quantity")
        .eq("department", "Main Stock" as any)
        .range(from, from + batchSize - 1);
      if (!data || data.length === 0) break;
      allData = [...allData, ...data];
      if (data.length < batchSize) break;
      from += batchSize;
    }
    const map = new Map<string, number>();
    allData.forEach(item => map.set(item.name, (map.get(item.name) || 0) + item.quantity));
    setMainStockItems(Array.from(map.entries()).map(([name, totalQty]) => ({ name, totalQty })));
  };

  useEffect(() => {
    const found = mainStockItems.find(i => i.name === selectedItem);
    setAvailableQty(found?.totalQty || 0);
  }, [selectedItem, mainStockItems]);

  const handleDistribute = async () => {
    if (!selectedItem || !department || !personName || !employeeId || !authDept || !designation || !contactNumber) {
      toast.error("Please fill all required fields"); return;
    }
    if (!approved) { toast.error("Please confirm approval before distributing"); return; }
    if (distributeQty <= 0) { toast.error("Quantity must be greater than 0"); return; }
    if (distributeQty > availableQty) { toast.error(`Insufficient stock. Available: ${availableQty}`); return; }
    if (department === "CSBS" && !cabinNumber) { toast.error("Please select a cabin number for CSBS"); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let fileUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const filePath = `${Date.now()}-${Math.random().toString(36).substr(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("distribution-files").upload(filePath, file);
        if (uploadError) throw uploadError;
        fileUrl = filePath;
      }

      const { data: stockItems } = await supabase
        .from("inventory_items")
        .select("id, quantity")
        .eq("department", "Main Stock" as any)
        .eq("name", selectedItem)
        .order("created_at", { ascending: true });

      if (!stockItems || stockItems.length === 0) throw new Error("Stock items not found");

      let remaining = distributeQty;
      for (const si of stockItems) {
        if (remaining <= 0) break;
        const deduct = Math.min(si.quantity, remaining);
        await supabase.from("inventory_items").update({ quantity: si.quantity - deduct }).eq("id", si.id);
        remaining -= deduct;
      }

      const insertPayload: any = {
        name: selectedItem, department: department as any, quantity: distributeQty,
        item_status: itemStatus, created_by: user.id,
      };
      if (department === "CSBS" && cabinNumber) insertPayload.cabin_number = cabinNumber;
      await supabase.from("inventory_items").insert(insertPayload);

      await supabase.from("distribution_records").insert({
        item_name: selectedItem, from_department: "Main Stock", to_department: department,
        quantity: distributeQty, item_status: itemStatus, authorized_person_name: personName,
        employee_id: employeeId, auth_department: authDept, designation, contact_number: contactNumber,
        digital_approval: true, distributed_by: user.id, notes: notes || null, file_url: fileUrl,
        cabin_number: department === "CSBS" ? cabinNumber : null,
      });

      toast.success("Stock distributed successfully!");
      setSelectedItem(""); setDistributeQty(1); setDepartment(""); setCabinNumber("");
      setNotes(""); setPersonName(""); setEmployeeId(""); setAuthDept("");
      setDesignation(""); setContactNumber(""); setApproved(false); setFile(null); setItemStatus("available");
      fetchMainStockItems();
    } catch (error: any) {
      toast.error(error.message || "Failed to distribute stock");
    } finally {
      setLoading(false);
    }
  };

  // Bulk Import Logic
  const handleBulkFileUpload = async (uploadedFile: File) => {
    setBulkFile(uploadedFile);
    setBulkSummary(null);
    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) { toast.error("File is empty"); return; }

      const stockMap = new Map<string, number>();
      mainStockItems.forEach(i => stockMap.set(i.name.toLowerCase(), i.totalQty));

      const seen = new Set<string>();
      const validated: BulkRow[] = rows.map((row, idx) => {
        const itemName = String(row["Item Name"] || row["item_name"] || "").trim();
        const quantity = parseInt(row["Quantity"] || row["quantity"]) || 0;
        const dept = String(row["Department"] || row["department"] || "").trim();
        const ledgerBook = String(row["Ledger Book"] || row["ledger_book"] || "").trim();
        const cabin = String(row["Cabin Number"] || row["cabin_number"] || "").trim();

        let error: string | undefined;
        if (!itemName) error = "Missing item name";
        else if (quantity <= 0) error = "Invalid quantity";
        else if (!dept || !departments.includes(dept as any)) error = `Invalid department: ${dept}`;
        else if (dept === "CSBS" && !cabin) error = "CSBS requires cabin number";
        else {
          const available = stockMap.get(itemName.toLowerCase()) || 0;
          if (quantity > available) error = `Insufficient stock (available: ${available})`;
          const key = `${itemName}-${dept}-${cabin}`.toLowerCase();
          if (seen.has(key)) error = "Duplicate entry";
          seen.add(key);
        }

        return { item_name: itemName, quantity, department: dept, ledger_book: ledgerBook || undefined, cabin_number: cabin || undefined, valid: !error, error };
      });

      setBulkData(validated);
    } catch (e: any) {
      toast.error("Failed to parse file: " + e.message);
    }
  };

  const processBulkImport = async () => {
    if (!approved) { toast.error("Please confirm approval"); return; }
    if (!personName || !employeeId || !authDept || !designation || !contactNumber) {
      toast.error("Please fill authorized person details"); return;
    }

    const validRows = bulkData.filter(r => r.valid);
    if (validRows.length === 0) { toast.error("No valid rows to import"); return; }

    setBulkProcessing(true);
    let success = 0, failed = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const row of validRows) {
        try {
          const { data: stockItems } = await supabase
            .from("inventory_items").select("id, quantity")
            .eq("department", "Main Stock" as any).eq("name", row.item_name)
            .order("created_at", { ascending: true });

          if (!stockItems || stockItems.length === 0) { failed++; continue; }

          let remaining = row.quantity;
          for (const si of stockItems) {
            if (remaining <= 0) break;
            const deduct = Math.min(si.quantity, remaining);
            await supabase.from("inventory_items").update({ quantity: si.quantity - deduct }).eq("id", si.id);
            remaining -= deduct;
          }

          const insertPayload: any = {
            name: row.item_name, department: row.department as any, quantity: row.quantity,
            item_status: "available", created_by: user.id,
          };
          if (row.cabin_number) insertPayload.cabin_number = row.cabin_number;
          if (row.ledger_book) insertPayload.lecture_book_number = row.ledger_book;
          await supabase.from("inventory_items").insert(insertPayload);

          await supabase.from("distribution_records").insert({
            item_name: row.item_name, from_department: "Main Stock", to_department: row.department,
            quantity: row.quantity, item_status: "available", authorized_person_name: personName,
            employee_id: employeeId, auth_department: authDept, designation, contact_number: contactNumber,
            digital_approval: true, distributed_by: user.id,
            cabin_number: row.cabin_number || null,
          });

          success++;
        } catch {
          failed++;
        }
      }

      setBulkSummary({ success, failed });
      if (success > 0) toast.success(`${success} items distributed successfully`);
      if (failed > 0) toast.error(`${failed} items failed`);
      fetchMainStockItems();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border border-primary/20">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Package className="h-10 w-10 text-primary" />
              Stock Distribution
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">Distribute stock from Main Stock to departments</p>
          </div>
        </div>

        {/* Tab Switch */}
        <div className="flex gap-2">
          <Button variant={activeTab === "manual" ? "default" : "outline"} onClick={() => setActiveTab("manual")}>
            <Package className="h-4 w-4 mr-2" /> Manual Distribution
          </Button>
          <Button variant={activeTab === "bulk" ? "default" : "outline"} onClick={() => setActiveTab("bulk")}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Bulk Import
          </Button>
        </div>

        {activeTab === "manual" ? (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Stock Details</CardTitle>
                  <CardDescription>Select item and quantity to distribute</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Item Name *</Label>
                    <Select value={selectedItem} onValueChange={setSelectedItem}>
                      <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>
                        {mainStockItems.map(item => (
                          <SelectItem key={item.name} value={item.name}>{item.name} (Qty: {item.totalQty})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedItem && (
                    <div className="p-3 rounded-lg bg-muted">
                      <span className="text-sm text-muted-foreground">Available: </span>
                      <span className="font-bold text-lg">{availableQty}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Quantity to Distribute *</Label>
                    <Input type="number" min={1} max={availableQty} value={distributeQty} onChange={e => setDistributeQty(parseInt(e.target.value) || 0)} />
                    {distributeQty > availableQty && availableQty > 0 && (
                      <p className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Exceeds available stock!</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Department *</Label>
                    <Select value={department} onValueChange={(v) => { setDepartment(v); setCabinNumber(""); }}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {department === "CSBS" && (
                    <div className="space-y-2">
                      <Label>CSBS Cabin Number *</Label>
                      <Select value={cabinNumber} onValueChange={setCabinNumber}>
                        <SelectTrigger><SelectValue placeholder="Select cabin" /></SelectTrigger>
                        <SelectContent>{cabinNumbers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Item Status</Label>
                    <Select value={itemStatus} onValueChange={setItemStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="working">Working</SelectItem>
                        <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" />Authorized Person</CardTitle>
                  <CardDescription>Person responsible for distribution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>Person Name *</Label><Input value={personName} onChange={e => setPersonName(e.target.value)} placeholder="Full name" /></div>
                  <div className="space-y-2"><Label>Employee ID *</Label><Input value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="Employee ID" /></div>
                  <div className="space-y-2"><Label>Department *</Label><Input value={authDept} onChange={e => setAuthDept(e.target.value)} placeholder="Department" /></div>
                  <div className="space-y-2"><Label>Designation *</Label><Input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Designation" /></div>
                  <div className="space-y-2"><Label>Contact Number *</Label><Input value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="Phone number" /></div>
                  <div className="p-3 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">Date & Time: </span>
                    <span className="font-medium">{new Date().toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Upload className="h-4 w-4" />Distribution File (Optional)</Label>
                    <Input type="file" accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox id="approval" checked={approved} onCheckedChange={(checked) => setApproved(!!checked)} />
                    <Label htmlFor="approval" className="text-sm cursor-pointer">I confirm this distribution is approved and authorized</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Button onClick={handleDistribute} disabled={loading || !approved} className="w-full h-12 text-lg" size="lg">
              {loading ? "Distributing..." : "Distribute Stock"}
            </Button>
          </>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Upload File</CardTitle>
                  <CardDescription>Upload CSV or Excel with distribution data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input type="file" accept=".xlsx,.xls,.csv" onChange={e => { const f = e.target.files?.[0]; if (f) handleBulkFileUpload(f); }} />
                  <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground space-y-1">
                    <p className="font-medium">Required columns:</p>
                    <p>Item Name, Quantity, Department</p>
                    <p className="font-medium mt-1">Optional columns:</p>
                    <p>Ledger Book, Cabin Number</p>
                  </div>
                  {bulkSummary && (
                    <div className="p-4 rounded-lg border space-y-2">
                      <p className="font-medium">Import Summary</p>
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle2 className="h-4 w-4" />{bulkSummary.success} success</span>
                        <span className="flex items-center gap-1 text-sm text-destructive"><XCircle className="h-4 w-4" />{bulkSummary.failed} failed</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" />Authorized Person</CardTitle>
                  <CardDescription>Required for bulk distribution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>Person Name *</Label><Input value={personName} onChange={e => setPersonName(e.target.value)} placeholder="Full name" /></div>
                  <div className="space-y-2"><Label>Employee ID *</Label><Input value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="Employee ID" /></div>
                  <div className="space-y-2"><Label>Department *</Label><Input value={authDept} onChange={e => setAuthDept(e.target.value)} placeholder="Department" /></div>
                  <div className="space-y-2"><Label>Designation *</Label><Input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Designation" /></div>
                  <div className="space-y-2"><Label>Contact Number *</Label><Input value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="Phone number" /></div>
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox id="bulk-approval" checked={approved} onCheckedChange={(checked) => setApproved(!!checked)} />
                    <Label htmlFor="bulk-approval" className="text-sm cursor-pointer">I confirm this bulk distribution is approved</Label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {bulkData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Preview ({bulkData.filter(r => r.valid).length} valid / {bulkData.filter(r => !r.valid).length} invalid)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Ledger Book</TableHead>
                          <TableHead>Cabin</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkData.map((row, idx) => (
                          <TableRow key={idx} className={row.valid ? "" : "bg-destructive/5"}>
                            <TableCell>{row.valid ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}</TableCell>
                            <TableCell className="font-medium">{row.item_name}</TableCell>
                            <TableCell>{row.quantity}</TableCell>
                            <TableCell>{row.department}</TableCell>
                            <TableCell>{row.ledger_book || "-"}</TableCell>
                            <TableCell>{row.cabin_number || "-"}</TableCell>
                            <TableCell className="text-destructive text-xs">{row.error || ""}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={processBulkImport} disabled={bulkProcessing || !approved || bulkData.filter(r => r.valid).length === 0} className="w-full h-12 text-lg" size="lg">
              {bulkProcessing ? "Processing..." : `Distribute ${bulkData.filter(r => r.valid).length} Items`}
            </Button>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StockDistribution;
