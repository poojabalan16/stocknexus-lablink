import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Package, Edit, Check, X, Filter } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { StatsGridSkeleton } from "@/components/skeletons/StatsCardSkeleton";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  model: string;
  serial_number: string;
  quantity: number;
  location: string;
  cabin_number: string;
  status: string;
  low_stock_threshold: number;
  is_working: boolean;
}

interface ItemSummary {
  name: string;
  totalQuantity: number;
  items: InventoryItem[];
  lowStockThreshold: number;
}

const DepartmentDetail = () => {
  const { department } = useParams<{ department: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [itemSummaries, setItemSummaries] = useState<ItemSummary[]>([]);
  const [editingCabinId, setEditingCabinId] = useState<string | null>(null);
  const [editingCabinValue, setEditingCabinValue] = useState("");

  const isWorkingStatusDept = department === "IT" || department === "AI&DS" || department === "CSE";

  useEffect(() => {
    checkAuth();
    fetchItems();
  }, [department]);

  useEffect(() => {
    // Filter items based on search and status
    let filtered = items;
    
    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.cabin_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredItems(filtered);
    
    // Calculate summaries grouped by item name, applying status filter
    const summaryMap = new Map<string, ItemSummary>();
    filtered.forEach(item => {
      const existing = summaryMap.get(item.name);
      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.items.push(item);
      } else {
        summaryMap.set(item.name, {
          name: item.name,
          totalQuantity: item.quantity,
          items: [item],
          lowStockThreshold: item.low_stock_threshold,
        });
      }
    });
    
    // Apply status filter to summaries
    let summaries = Array.from(summaryMap.values());
    if (statusFilter !== "all") {
      if (isWorkingStatusDept) {
        // For IT, CSE, AI&DS - filter by working status
        summaries = summaries.filter(summary => {
          if (statusFilter === "working") return summary.items.every(item => item.is_working);
          if (statusFilter === "not_working") return summary.items.some(item => !item.is_working);
          if (statusFilter === "low_stock") return summary.totalQuantity > 0 && summary.totalQuantity <= summary.lowStockThreshold;
          if (statusFilter === "in_stock") return summary.totalQuantity > summary.lowStockThreshold;
          return true;
        });
      } else {
        // For other departments - standard stock filters
        summaries = summaries.filter(summary => {
          if (statusFilter === "out_of_stock") return summary.totalQuantity === 0;
          if (statusFilter === "low_stock") return summary.totalQuantity > 0 && summary.totalQuantity <= summary.lowStockThreshold;
          if (statusFilter === "in_stock") return summary.totalQuantity > summary.lowStockThreshold;
          return true;
        });
      }
    }
    
    setItemSummaries(summaries);
  }, [searchQuery, items, statusFilter, isWorkingStatusDept]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, department")
      .eq("user_id", user.id)
      .single();

    if (roles) {
      setUserRole(roles.role);
      setUserDepartment(roles.department);
    }
  };

  const fetchItems = async () => {
    if (!department) return;

    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("department", department as any)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
      setFilteredItems(data || []);
    } catch (error: any) {
      toast.error("Failed to load inventory items");
    } finally {
      setLoading(false);
    }
  };

  const canManageItems = () => {
    return userRole === "admin" || (userRole === "hod" && userDepartment === department);
  };

  const handleCabinEdit = (item: InventoryItem) => {
    setEditingCabinId(item.id);
    setEditingCabinValue(item.cabin_number || "");
  };

  const handleCabinSave = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("inventory_items")
        .update({ cabin_number: editingCabinValue || null })
        .eq("id", itemId);

      if (error) throw error;

      setItems(items.map(item => 
        item.id === itemId ? { ...item, cabin_number: editingCabinValue } : item
      ));
      toast.success("Cabin number updated");
    } catch (error: any) {
      toast.error("Failed to update cabin number");
    } finally {
      setEditingCabinId(null);
      setEditingCabinValue("");
    }
  };

  const handleCabinCancel = () => {
    setEditingCabinId(null);
    setEditingCabinValue("");
  };

  const handleWorkingStatusChange = async (itemId: string, isWorking: boolean) => {
    if (!canManageItems()) return;
    
    try {
      const { error } = await supabase
        .from("inventory_items")
        .update({ is_working: isWorking })
        .eq("id", itemId);

      if (error) throw error;

      setItems(items.map(item => 
        item.id === itemId ? { ...item, is_working: isWorking } : item
      ));
      toast.success(`Item marked as ${isWorking ? "working" : "not working"}`);
    } catch (error: any) {
      toast.error("Failed to update working status");
    }
  };

  const getStatusBadge = (summary: ItemSummary) => {
    if (summary.totalQuantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (summary.totalQuantity <= summary.lowStockThreshold) {
      return <Badge variant="outline" className="border-alert text-alert">Low Stock</Badge>;
    } else {
      return <Badge variant="default" className="bg-success">In Stock</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">{department} Department</h1>
              <p className="text-muted-foreground mt-1">Loading inventory items...</p>
            </div>
          </div>
          <StatsGridSkeleton />
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
            </CardHeader>
            <CardContent>
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
            <h1 className="text-3xl font-bold">{department} Department</h1>
            <p className="text-muted-foreground">Manage inventory for the {department} department</p>
          </div>
          {canManageItems() && (
            <Button onClick={() => navigate("/inventory/add")} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Items
            </CardTitle>
            <CardDescription>Browse and manage all items in this department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, model, serial number, cabin..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    {isWorkingStatusDept ? (
                      <>
                        <SelectItem value="working">Working</SelectItem>
                        <SelectItem value="not_working">Not Working</SelectItem>
                      </>
                    ) : (
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Summary Statistics */}
              {itemSummaries.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {itemSummaries.reduce((sum, s) => sum + s.totalQuantity, 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Item Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{itemSummaries.length}</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : itemSummaries.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No items found matching your search" : "No items in this department"}
                </p>
              ) : (
                <div className="space-y-6">
                  {itemSummaries.map((summary) => (
                    <div key={summary.name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{summary.name}</h3>
                          {getStatusBadge(summary)}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Total Quantity</div>
                          <div className="text-xl font-bold">{summary.totalQuantity}</div>
                        </div>
                      </div>
                      
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Serial Number</TableHead>
                              <TableHead>Model</TableHead>
                              <TableHead>Qty</TableHead>
                              {isWorkingStatusDept && (
                                <>
                                  <TableHead>Cabin Number</TableHead>
                                  <TableHead>Status</TableHead>
                                </>
                              )}
                              <TableHead>Location</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summary.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-mono text-sm">
                                  {item.serial_number || "-"}
                                </TableCell>
                                <TableCell>{item.model || "-"}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                {isWorkingStatusDept && (
                                  <>
                                    <TableCell>
                                      {editingCabinId === item.id ? (
                                        <div className="flex items-center gap-1">
                                          <Input
                                            value={editingCabinValue}
                                            onChange={(e) => setEditingCabinValue(e.target.value)}
                                            className="h-8 w-24"
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") handleCabinSave(item.id);
                                              if (e.key === "Escape") handleCabinCancel();
                                            }}
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => handleCabinSave(item.id)}
                                          >
                                            <Check className="h-4 w-4 text-success" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={handleCabinCancel}
                                          >
                                            <X className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <span
                                          className={canManageItems() ? "cursor-pointer hover:underline" : ""}
                                          onClick={() => canManageItems() && handleCabinEdit(item)}
                                        >
                                          {item.cabin_number || "-"}
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Switch
                                          checked={item.is_working}
                                          onCheckedChange={(checked) => handleWorkingStatusChange(item.id, checked)}
                                          disabled={!canManageItems()}
                                        />
                                        <Badge variant={item.is_working ? "default" : "destructive"} className={item.is_working ? "bg-success" : ""}>
                                          {item.is_working ? "Working" : "Not Working"}
                                        </Badge>
                                      </div>
                                    </TableCell>
                                  </>
                                )}
                                <TableCell>{item.location || "-"}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/inventory/${item.id}`)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DepartmentDetail;
