import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Package, ArrowLeft, Save, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ItemDetailSkeleton } from "@/components/skeletons/ItemDetailSkeleton";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  model: string | null;
  serial_number: string | null;
  quantity: number;
  location: string | null;
  department: string;
  status: string;
  low_stock_threshold: number;
  specifications: any;
  created_at: string;
  unit_price?: number | null;
}

const ItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [location, setLocation] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  useEffect(() => {
    checkAuth();
    fetchItem();
  }, [id]);

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

  const fetchItem = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      setItem(data);
      setName(data.name);
      setCategory(data.category);
      setModel(data.model || "");
      setSerialNumber(data.serial_number || "");
      setQuantity(data.quantity.toString());
      setLowStockThreshold(data.low_stock_threshold.toString());
      setLocation(data.location || "");
      setSpecifications(JSON.stringify(data.specifications || {}, null, 2));
      setUnitPrice((data as any).unit_price?.toString() || "0");
    } catch (error: any) {
      toast.error("Failed to load item details");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const canEdit = () => {
    if (!item) return false;
    return userRole === "admin" || (userRole === "hod" && userDepartment === item.department);
  };

  const handleSave = async () => {
    if (!item || !canEdit()) return;

    setSaving(true);
    try {
      let specsObj = {};
      if (specifications.trim()) {
        try {
          specsObj = JSON.parse(specifications);
        } catch {
          toast.error("Invalid JSON format for specifications");
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from("inventory_items")
        .update({
          name,
          category,
          model: model || null,
          serial_number: serialNumber || null,
          quantity: parseInt(quantity),
          low_stock_threshold: parseInt(lowStockThreshold),
          location: location || null,
          specifications: specsObj,
          unit_price: unitPrice ? parseFloat(unitPrice) : 0,
        })
        .eq("id", item.id);

      if (error) throw error;

      toast.success("Item updated successfully!");
      fetchItem();
    } catch (error: any) {
      toast.error(error.message || "Failed to update item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item || !canEdit()) return;

    try {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      toast.success("Item deleted successfully!");
      navigate(`/departments/${item.department}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete item");
    }
  };

  const getStatusBadge = () => {
    if (!item) return null;
    if (item.quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (item.quantity <= item.low_stock_threshold) {
      return <Badge variant="outline" className="border-alert text-alert">Low Stock</Badge>;
    } else {
      return <Badge variant="default" className="bg-success">In Stock</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <ItemDetailSkeleton />
      </DashboardLayout>
    );
  }

  if (!item) {
    return (
      <DashboardLayout>
        <p className="text-center py-8 text-muted-foreground">Item not found</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/departments/${item.department}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{item.name}</h1>
              <p className="text-muted-foreground">{item.department} Department</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Item Details
            </CardTitle>
            <CardDescription>
              {canEdit() ? "View and edit item information" : "View item information"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!canEdit()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={!canEdit()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={!canEdit()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial">Serial Number</Label>
                  <Input
                    id="serial"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    disabled={!canEdit()}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={!canEdit()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Unit Price (₹)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    disabled={!canEdit()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="threshold">Low Stock Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    disabled={!canEdit()}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={!canEdit()}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specs">Specifications</Label>
                <Textarea
                  id="specs"
                  value={specifications}
                  onChange={(e) => setSpecifications(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                  disabled={!canEdit()}
                />
              </div>

              {canEdit() && (
                <div className="flex gap-4">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete Item
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Item</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{item.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ItemDetail;
