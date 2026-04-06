import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRightLeft, Plus, Search, Package, MoveRight } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

const ALL_DEPARTMENTS = [
  "IT", "AI&DS", "CSE", "Physics", "Chemistry", "Bio-tech", "Chemical",
  "Mechanical", "Accounts", "Exam Cell", "Library", "ECE", "EEE", "CIVIL", "CSBS", "MBA", "Main Stock",
];

interface DeptItem {
  id: string;
  name: string;
  serial_number: string | null;
  model: string | null;
  quantity: number;
  category: string | null;
  lecture_book_number: string | null;
  cabin_number: string | null;
}

const ItemMovements = () => {
  const navigate = useNavigate();
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  // Form state
  const [movementMode, setMovementMode] = useState<"single" | "bulk">("single");
  const [fromDept, setFromDept] = useState("");
  const [toDept, setToDept] = useState("");
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Department items
  const [deptItems, setDeptItems] = useState<DeptItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    checkAuth();
    fetchMovements();
  }, []);

  useEffect(() => {
    if (fromDept) {
      fetchDeptItems(fromDept);
    } else {
      setDeptItems([]);
      setSelectedItemIds(new Set());
      setItemQuantities({});
    }
  }, [fromDept]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    if (roles) setUserRole(roles.role);
  };

  const fetchMovements = async () => {
    const { data, error } = await supabase
      .from("item_movements")
      .select("*")
      .eq("is_deleted", false)
      .order("movement_date", { ascending: false });
    if (!error) setMovements(data || []);
    setLoading(false);
  };

  const fetchDeptItems = async (dept: string) => {
    setLoadingItems(true);
    setSelectedItemIds(new Set());
    setItemQuantities({});
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id, name, serial_number, model, quantity, category, lecture_book_number, cabin_number")
      .eq("department", dept as any)
      .gt("quantity", 0)
      .order("name");
    if (!error) setDeptItems(data || []);
    setLoadingItems(false);
  };

  const toggleItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setItemQuantities(q => { const n = { ...q }; delete n[id]; return n; });
      } else {
        next.add(id);
        const item = deptItems.find(i => i.id === id);
        if (item) setItemQuantities(q => ({ ...q, [id]: item.quantity }));
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedItemIds.size === deptItems.length) {
      setSelectedItemIds(new Set());
      setItemQuantities({});
    } else {
      const allIds = new Set(deptItems.map(i => i.id));
      const allQty: Record<string, number> = {};
      deptItems.forEach(i => { allQty[i.id] = i.quantity; });
      setSelectedItemIds(allIds);
      setItemQuantities(allQty);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromDept === toDept) { toast.error("Source and destination must be different"); return; }
    if (selectedItemIds.size === 0) { toast.error("Select at least one item to move"); return; }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const itemId of selectedItemIds) {
        const item = deptItems.find(i => i.id === itemId);
        if (!item) continue;
        const qty = itemQuantities[itemId] || item.quantity;

        if (qty > item.quantity) {
          toast.error(`Cannot move ${qty} of "${item.name}" — only ${item.quantity} available`);
          setSubmitting(false);
          return;
        }
        if (qty <= 0) continue;

        // Create movement record
        await supabase.from("item_movements").insert({
          item_name: item.name,
          lecture_book_number: item.lecture_book_number || null,
          from_department: fromDept as any,
          to_department: toDept as any,
          quantity: qty,
          movement_date: movementDate,
          reason: reason || null,
          moved_by: user.id,
        });

        // Reduce source
        await supabase.from("inventory_items").update({ quantity: item.quantity - qty }).eq("id", itemId);

        // Add/increase in destination
        const { data: destItems } = await supabase
          .from("inventory_items")
          .select("id, quantity")
          .eq("name", item.name)
          .eq("department", toDept as any)
          .limit(1);

        if (destItems && destItems.length > 0) {
          await supabase.from("inventory_items").update({ quantity: destItems[0].quantity + qty }).eq("id", destItems[0].id);
        } else {
          await supabase.from("inventory_items").insert({
            name: item.name,
            category: item.category,
            model: item.model,
            serial_number: item.serial_number,
            quantity: qty,
            department: toDept as any,
            lecture_book_number: item.lecture_book_number,
            cabin_number: null,
            created_by: user.id,
            status: "available",
          });
        }
      }

      toast.success(`${selectedItemIds.size} item(s) moved successfully!`);
      setDialogOpen(false);
      resetForm();
      fetchMovements();
    } catch (error: any) {
      toast.error(error.message || "Failed to move items");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFromDept(""); setToDept(""); setReason("");
    setMovementDate(new Date().toISOString().split("T")[0]);
    setMovementMode("single");
    setSelectedItemIds(new Set());
    setItemQuantities({});
    setDeptItems([]);
  };

  const filtered = movements.filter(m =>
    m.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.lecture_book_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.from_department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.to_department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Item Movements</h1>
            <p className="text-muted-foreground">Track and manage inter-department item transfers</p>
          </div>
          {userRole === "admin" && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" />New Movement</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Move Items Between Departments</DialogTitle>
                  <DialogDescription>Select a source department to see available items, then choose what to move</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Department selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>From Department *</Label>
                      <Select value={fromDept} onValueChange={setFromDept}>
                        <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                        <SelectContent>
                          {ALL_DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>To Department *</Label>
                      <Select value={toDept} onValueChange={setToDept}>
                        <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                        <SelectContent>
                          {ALL_DEPARTMENTS.filter(d => d !== fromDept).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Movement Date *</Label>
                      <Input type="date" value={movementDate} onChange={e => setMovementDate(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional reason" />
                    </div>
                  </div>

                  {/* Items list */}
                  {fromDept && (
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Items in {fromDept} ({deptItems.length})
                          </CardTitle>
                          {deptItems.length > 0 && (
                            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                              {selectedItemIds.size === deptItems.length ? "Deselect All" : "Select All"}
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        {loadingItems ? (
                          <TableSkeleton rows={3} columns={5} />
                        ) : deptItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No items found in {fromDept}</p>
                        ) : (
                          <div className="max-h-[300px] overflow-y-auto border rounded-md">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-10"></TableHead>
                                  <TableHead>Item Name</TableHead>
                                  <TableHead>Serial No.</TableHead>
                                  <TableHead>Model</TableHead>
                                  <TableHead>Available</TableHead>
                                  <TableHead>Move Qty</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {deptItems.map(item => (
                                  <TableRow key={item.id} className={selectedItemIds.has(item.id) ? "bg-accent/50" : ""}>
                                    <TableCell>
                                      <Checkbox
                                        checked={selectedItemIds.has(item.id)}
                                        onCheckedChange={() => toggleItem(item.id)}
                                      />
                                    </TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{item.serial_number || "—"}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{item.model || "—"}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>
                                      {selectedItemIds.has(item.id) && (
                                        <Input
                                          type="number"
                                          min={1}
                                          max={item.quantity}
                                          value={itemQuantities[item.id] ?? item.quantity}
                                          onChange={e => setItemQuantities(q => ({
                                            ...q,
                                            [item.id]: Math.min(parseInt(e.target.value) || 1, item.quantity)
                                          }))}
                                          className="w-20 h-8"
                                        />
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {selectedItemIds.size > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MoveRight className="h-4 w-4" />
                      <span>{selectedItemIds.size} item(s) selected to move{toDept ? ` → ${toDept}` : ""}</span>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting || selectedItemIds.size === 0 || !toDept}>
                      {submitting ? "Moving..." : `Move ${selectedItemIds.size} Item(s)`}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />Movement History
            </CardTitle>
            <CardDescription>All inter-department item transfers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search movements..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            {loading ? <TableSkeleton rows={6} columns={6} /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>LBN</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{new Date(m.movement_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{m.item_name}</TableCell>
                      <TableCell><Badge variant="outline">{m.lecture_book_number || "-"}</Badge></TableCell>
                      <TableCell>{m.from_department}</TableCell>
                      <TableCell>{m.to_department}</TableCell>
                      <TableCell>{m.quantity}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{m.reason || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No movements found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ItemMovements;
