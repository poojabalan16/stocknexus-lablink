import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Package, Edit, Trash2 } from "lucide-react";
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [itemSummaries, setItemSummaries] = useState<ItemSummary[]>([]);

  useEffect(() => {
    checkAuth();
    fetchItems();
  }, [department]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.serial_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
    
    // Calculate summaries grouped by item name
    const summaryMap = new Map<string, ItemSummary>();
    items.forEach(item => {
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
    setItemSummaries(Array.from(summaryMap.values()));
  }, [searchQuery, items]);

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
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, category, model, or serial number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                />
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
                              <TableHead>Category</TableHead>
                              <TableHead>Qty</TableHead>
                              {(department === "IT" || department === "AI&DS" || department === "CSE") && (
                                <TableHead>Cabin Number</TableHead>
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
                                <TableCell>{item.category}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                {(department === "IT" || department === "AI&DS" || department === "CSE") && (
                                  <TableCell>{item.cabin_number || "-"}</TableCell>
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
