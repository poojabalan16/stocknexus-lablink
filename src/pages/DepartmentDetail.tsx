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

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  model: string;
  serial_number: string;
  quantity: number;
  location: string;
  status: string;
  low_stock_threshold: number;
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

  const getStatusBadge = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (item.quantity <= item.low_stock_threshold) {
      return <Badge variant="outline" className="border-alert text-alert">Low Stock</Badge>;
    } else {
      return <Badge variant="default" className="bg-success">In Stock</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
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

              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : filteredItems.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No items found matching your search" : "No items in this department"}
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.model || "N/A"}</TableCell>
                          <TableCell className="font-mono text-sm">{item.serial_number || "N/A"}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.location || "N/A"}</TableCell>
                          <TableCell>{getStatusBadge(item)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/inventory/${item.id}`)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
