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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Search, Plus, Package, Calendar, User } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { format } from "date-fns";

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
}

interface InventoryItem {
  id: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  department: string;
  quantity: number;
}

interface Profile {
  id: string;
  full_name: string;
}

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
  const [submitting, setSubmitting] = useState(false);

  const departments = ["IT", "AI&DS", "CSE", "Physics", "Chemistry", "Bio-tech", "Chemical", "Mechanical"];

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
      const { data, error } = await supabase
        .from("scrap_items")
        .select("*")
        .order("scrapped_at", { ascending: false });

      if (error) throw error;
      setScrapItems(data || []);
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
        .select("id, name, model, serial_number, department, quantity")
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

  const handleScrapItem = async () => {
    if (!selectedItem || !scrapReason || !userId) {
      toast.error("Please select an item and provide a reason");
      return;
    }

    const item = inventoryItems.find(i => i.id === selectedItem);
    if (!item) {
      toast.error("Selected item not found");
      return;
    }

    const qty = parseInt(scrapQuantity);
    if (isNaN(qty) || qty < 1 || qty > item.quantity) {
      toast.error(`Quantity must be between 1 and ${item.quantity}`);
      return;
    }

    setSubmitting(true);

    try {
      // Insert scrap record
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
        });

      if (scrapError) throw scrapError;

      // Update or delete inventory item
      const newQuantity = item.quantity - qty;
      if (newQuantity === 0) {
        const { error: deleteError } = await supabase
          .from("inventory_items")
          .delete()
          .eq("id", item.id);
        if (deleteError) throw deleteError;
      } else {
        const { error: updateError } = await supabase
          .from("inventory_items")
          .update({ quantity: newQuantity })
          .eq("id", item.id);
        if (updateError) throw updateError;
      }

      toast.success("Item moved to scrap successfully");
      setIsDialogOpen(false);
      resetForm();
      fetchScrapItems();
      fetchInventoryItems();
    } catch (error: any) {
      toast.error(error.message || "Failed to scrap item");
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
  };

  const filteredInventoryItems = inventoryItems.filter(item => 
    selectedDepartment === "all" || item.department === selectedDepartment
  );

  const filteredScrapItems = scrapItems.filter(item => {
    const matchesSearch = 
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentFilter === "all" || item.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  const getSelectedItem = () => inventoryItems.find(i => i.id === selectedItem);

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
            <DialogContent className="sm:max-w-lg">
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

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
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
                  placeholder="Search by name, serial number, or reason..."
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

            {filteredScrapItems.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {searchQuery || departmentFilter !== "all" 
                  ? "No scrap items found matching your filters" 
                  : "No items have been scrapped yet"}
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Model/Serial</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Scrapped By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScrapItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
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