import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Search, Plus, Package, Calendar, User, IndianRupee, Upload, CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { format } from "date-fns";
import { Constants } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";

interface ScrapItem {
  id: string;
  item_id: string | null;
  item_name: string;
  item_model: string | null;
  item_serial_number: string | null;
  department: string;
  quantity: number;
  reason: string;
  scrapped_by: string;
  scrapped_at: string;
  notes: string | null;
  scrap_value: number | null;
  vendor_name: string | null;
  vendor_contact: string | null;
  lecture_book_number: string | null;
  bill_url: string | null;
  disposal_certificate_url: string | null;
}

interface InventoryItem {
  id: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  department: string;
  quantity: number;
  lecture_book_number: string | null;
}

interface Profile {
  id: string;
  full_name: string;
}

const departments = Constants.public.Enums.department;

const ScrapManagement = () => {
  const navigate = useNavigate();
  const [scrapItems, setScrapItems] = useState<ScrapItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [scrapQuantity, setScrapQuantity] = useState<string>("1");
  const [scrapReason, setScrapReason] = useState("");
  const [scrapNotes, setScrapNotes] = useState("");
  const [scrapValue, setScrapValue] = useState<string>("");
  const [vendorName, setVendorName] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemQuantities, setItemQuantities] = useState<Record<string, string>>({});

  // Bulk import state
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchScrapItems();
      fetchInventoryItems();
      fetchProfiles();
    }
  }, [userRole, userDepartment]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    setUserId(user.id);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, department")
      .eq("user_id", user.id)
      .single();

    if (roles) {
      if (roles.role !== "admin" && roles.role !== "hod") {
        toast.error("Access denied. Only admins and HODs can access this page.");
        navigate("/");
        return;
      }
      setUserRole(roles.role);
      setUserDepartment(roles.department);
    }
  };

  const fetchScrapItems = async () => {
    try {
      let allData: ScrapItem[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("scrap_items")
          .select("*")
          .order("scrapped_at", { ascending: false })
          .range(from, from + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
      }
      setScrapItems(allData);
    } catch (error: any) {
      toast.error("Failed to load scrap items");
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      let query = supabase
        .from("inventory_items")
        .select("id, name, model, serial_number, department, quantity, lecture_book_number")
        .gt("quantity", 0);

      if (userRole === "hod" && userDepartment) {
        query = query.eq("department", userDepartment as any);
      }

      const { data, error } = await query.order("name");

      if (error) throw error;
      setInventoryItems(data || []);
    } catch (error: any) {
      toast.error("Failed to load inventory items");
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (error) throw error;
      
      const profileMap = new Map<string, string>();
      data?.forEach(profile => {
        profileMap.set(profile.id, profile.full_name);
      });
      setProfiles(profileMap);
    } catch (error) {
      console.error("Failed to load profiles");
    }
  };

  const handleScrapItems = async () => {
    if (selectedItems.size === 0 || !scrapReason || !userId) {
      toast.error("Please select item(s) and provide a reason");
      return;
    }

    setSubmitting(true);

    try {
      for (const itemId of selectedItems) {
        const item = inventoryItems.find(i => i.id === itemId);
        if (!item) continue;

        const qty = parseInt(itemQuantities[itemId] || "1");
        if (isNaN(qty) || qty < 1 || qty > item.quantity) continue;

        const { error: scrapError } = await supabase
          .from("scrap_items")
          .insert({
            item_id: item.id,
            item_name: item.name,
            item_model: item.model,
            item_serial_number: item.serial_number,
            department: item.department as any,
            quantity: qty,
            reason: scrapReason,
            scrapped_by: userId,
            notes: scrapNotes || null,
            scrap_value: scrapValue ? parseFloat(scrapValue) : null,
            vendor_name: vendorName || null,
            vendor_contact: vendorContact || null,
            lecture_book_number: item.lecture_book_number || null,
          });

        if (scrapError) throw scrapError;

        const newQuantity = item.quantity - qty;
        if (newQuantity === 0) {
          await supabase.from("inventory_items").delete().eq("id", item.id);
        } else {
          await supabase.from("inventory_items").update({ quantity: newQuantity }).eq("id", item.id);
        }
      }

      toast.success(`${selectedItems.size} item(s) moved to scrap successfully`);
      setIsDialogOpen(false);
      resetForm();
      fetchScrapItems();
      fetchInventoryItems();
    } catch (error: any) {
      toast.error(error.message || "Failed to scrap items");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedDepartment(userRole === "hod" ? userDepartment || "all" : "all");
    setSelectedItem("");
    setScrapQuantity("1");
    setScrapReason("");
    setScrapNotes("");
    setScrapValue("");
    setVendorName("");
    setVendorContact("");
  };

  const parseExcelFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsBinaryString(file);
    });
  };

  const handleBulkImport = async () => {
    if (!bulkFile || !userId) {
      toast.error("Please select a file");
      return;
    }

    const ext = bulkFile.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      toast.error("Only Excel and CSV files are supported for bulk import");
      return;
    }

    setBulkImporting(true);
    try {
      let parsedData: any[] = [];

      if (ext === 'xlsx' || ext === 'xls') {
        parsedData = await parseExcelFile(bulkFile);
      } else {
        const text = await bulkFile.text();
        const lines = text.split("\n").filter(line => line.trim());
        if (lines.length < 2) { toast.error("File is empty"); setBulkImporting(false); return; }
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim());
          const row: any = {};
          headers.forEach((header, index) => { row[header] = values[index]; });
          parsedData.push(row);
        }
      }

      if (parsedData.length === 0) { toast.error("No data found in file"); setBulkImporting(false); return; }

      const requiredFields = ["item_name", "department", "reason"];
      const availableFields = Object.keys(parsedData[0]).map(k => k.toLowerCase());
      const missing = requiredFields.filter(f => !availableFields.includes(f));
      if (missing.length > 0) {
        toast.error(`Missing required columns: ${missing.join(", ")}. Required: item_name, department, reason`);
        setBulkImporting(false);
        return;
      }

      const scrapRecords = parsedData.map((row: any) => {
        const norm: any = {};
        Object.keys(row).forEach(k => { norm[k.toLowerCase()] = row[k]; });
        return {
          item_name: norm.item_name,
          department: norm.department as any,
          quantity: parseInt(norm.quantity) || 1,
          reason: norm.reason,
          scrapped_by: userId,
          notes: norm.notes || null,
          scrap_value: norm.scrap_value ? parseFloat(norm.scrap_value) : null,
          vendor_name: norm.vendor_name || null,
          vendor_contact: norm.vendor_contact || null,
          lecture_book_number: norm.lecture_book_number || norm.ledger_book_number || null,
          item_model: norm.item_model || norm.model || null,
          item_serial_number: norm.item_serial_number || norm.serial_number || null,
        };
      }).filter((r: any) => r.item_name && r.department && r.reason);

      if (scrapRecords.length === 0) { toast.error("No valid records found"); setBulkImporting(false); return; }

      const { error } = await supabase.from("scrap_items").insert(scrapRecords);
      if (error) throw error;

      toast.success(`Successfully imported ${scrapRecords.length} scrap record(s)!`);
      setBulkFile(null);
      fetchScrapItems();
    } catch (error: any) {
      toast.error(error.message || "Failed to import scrap items");
    } finally {
      setBulkImporting(false);
    }
  };

  const filteredInventoryItems = inventoryItems.filter(item => 
    selectedDepartment === "all" || item.department === selectedDepartment
  );

  const filteredScrapItems = scrapItems.filter(item => {
    const matchesSearch = 
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lecture_book_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentFilter === "all" || item.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  const totalScrapValue = scrapItems.reduce((sum, item) => sum + (item.scrap_value || 0), 0);

  const getSelectedItem = () => inventoryItems.find(i => i.id === selectedItem);

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredScrapItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredScrapItems.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedItems.size} scrap record(s)?`);
    if (!confirmed) return;
    try {
      const { error } = await supabase
        .from("scrap_items")
        .delete()
        .in("id", Array.from(selectedItems));
      if (error) throw error;
      toast.success(`Deleted ${selectedItems.size} scrap record(s)`);
      setSelectedItems(new Set());
      fetchScrapItems();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete scrap items");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Scrap Management</h1>
            <p className="text-muted-foreground mt-1">Loading...</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <TableSkeleton rows={8} columns={6} />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Scrap Management</h1>
            <p className="text-muted-foreground">
              Move outdated or damaged items to scrap
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Move to Scrap
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Move Item to Scrap</DialogTitle>
                <DialogDescription>
                  Select an inventory item to move to scrap. This action will reduce the item's quantity.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {userRole === "admin" && (
                  <div className="space-y-2">
                    <Label htmlFor="department">Filter by Department</Label>
                    <Select value={selectedDepartment} onValueChange={(val) => {
                      setSelectedDepartment(val);
                      setSelectedItem("");
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="item">Select Item *</Label>
                  <Select value={selectedItem} onValueChange={setSelectedItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredInventoryItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} {item.serial_number ? `(${item.serial_number})` : ""} - {item.department} (Qty: {item.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {getSelectedItem() && (
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity to Scrap *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max={getSelectedItem()?.quantity}
                      value={scrapQuantity}
                      onChange={(e) => setScrapQuantity(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum: {getSelectedItem()?.quantity}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Scrapping *</Label>
                  <Select value={scrapReason} onValueChange={setScrapReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Outdated">Outdated</SelectItem>
                      <SelectItem value="Beyond Repair">Beyond Repair</SelectItem>
                      <SelectItem value="Damaged">Damaged</SelectItem>
                      <SelectItem value="Obsolete">Obsolete</SelectItem>
                      <SelectItem value="End of Life">End of Life</SelectItem>
                      <SelectItem value="Non-functional">Non-functional</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scrap-value">Scrap / Salvage Value (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="scrap-value"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-10"
                      value={scrapValue}
                      onChange={(e) => setScrapValue(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vendor-name">Vendor / Buyer Name</Label>
                    <Input
                      id="vendor-name"
                      placeholder="Enter vendor name"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor-contact">Vendor Contact</Label>
                    <Input
                      id="vendor-contact"
                      placeholder="Phone or email"
                      value={vendorContact}
                      onChange={(e) => setVendorContact(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional details..."
                    value={scrapNotes}
                    onChange={(e) => setScrapNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleScrapItem} 
                  disabled={submitting || !selectedItem || !scrapReason}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {submitting ? "Processing..." : "Move to Scrap"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Bulk Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Bulk Import Scrap Items
            </CardTitle>
            <CardDescription>Upload Excel or CSV file to import multiple scrap records at once</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Select File (Excel or CSV)</Label>
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  Required columns: item_name, department, reason. Optional: quantity, scrap_value, vendor_name, vendor_contact, notes, ledger_book_number, model, serial_number
                </p>
              </div>
              <Button onClick={handleBulkImport} disabled={bulkImporting || !bulkFile} className="gap-2">
                <Upload className="h-4 w-4" />
                {bulkImporting ? "Importing..." : "Import"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Scrapped Items</CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scrapItems.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Quantity Scrapped</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {scrapItems.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Scrap Value</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalScrapValue.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Departments Affected</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(scrapItems.map(i => i.department)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scrap History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Scrap History
            </CardTitle>
            <CardDescription>View all items that have been moved to scrap</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, serial number, vendor, or LBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {userRole === "admin" && (
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedItems.size > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted mb-4">
                <CheckSquare className="h-4 w-4" />
                <span className="text-sm font-medium">{selectedItems.size} item(s) selected</span>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="ml-auto gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedItems(new Set())}>
                  Clear Selection
                </Button>
              </div>
            )}

            {filteredScrapItems.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {searchQuery || departmentFilter !== "all" 
                  ? "No scrap items found matching your filters" 
                  : "No items have been scrapped yet"}
              </p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedItems.size === filteredScrapItems.length && filteredScrapItems.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>LBN</TableHead>
                      <TableHead>Model/Serial</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Scrap Value</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Scrapped By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScrapItems.map((item) => (
                      <TableRow key={item.id} className={selectedItems.has(item.id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => toggleSelectItem(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>
                          {item.lecture_book_number ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              {item.lecture_book_number}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {item.item_model && <div>{item.item_model}</div>}
                            {item.item_serial_number && (
                              <div className="font-mono text-xs text-muted-foreground">
                                {item.item_serial_number}
                              </div>
                            )}
                            {!item.item_model && !item.item_serial_number && "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.department}</Badge>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.reason}</Badge>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                              {item.notes}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.scrap_value ? `₹${item.scrap_value.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>
                          {item.vendor_name ? (
                            <div className="text-sm">
                              <div>{item.vendor_name}</div>
                              {item.vendor_contact && (
                                <div className="text-xs text-muted-foreground">{item.vendor_contact}</div>
                              )}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {profiles.get(item.scrapped_by) || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(item.scrapped_at), "dd MMM yyyy")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ScrapManagement;
