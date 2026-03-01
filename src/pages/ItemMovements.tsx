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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRightLeft, Plus, Search } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

const ALL_DEPARTMENTS = [
  "IT", "AI&DS", "CSE", "Physics", "Chemistry", "Bio-tech", "Chemical",
  "Mechanical", "Accounts", "Exam Cell", "Library", "ECE", "EEE", "CIVIL", "CSBS", "MBA",
];

const ItemMovements = () => {
  const navigate = useNavigate();
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  // Form state
  const [itemName, setItemName] = useState("");
  const [lectureBookNumber, setLectureBookNumber] = useState("");
  const [fromDept, setFromDept] = useState("");
  const [toDept, setToDept] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchMovements();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromDept === toDept) { toast.error("Source and destination departments must be different"); return; }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const qty = parseInt(quantity);

      // Validate stock availability
      const { data: sourceItems } = await supabase
        .from("inventory_items")
        .select("id, quantity")
        .eq("name", itemName)
        .eq("department", fromDept as any);

      const totalAvailable = (sourceItems || []).reduce((sum, i) => sum + i.quantity, 0);
      if (totalAvailable < qty) {
        toast.error(`Insufficient stock. Available: ${totalAvailable}, Requested: ${qty}`);
        setSubmitting(false);
        return;
      }

      // Create movement record
      const { error: moveError } = await supabase.from("item_movements").insert({
        item_name: itemName,
        lecture_book_number: lectureBookNumber || null,
        from_department: fromDept as any,
        to_department: toDept as any,
        quantity: qty,
        movement_date: movementDate,
        reason: reason || null,
        moved_by: user.id,
      });
      if (moveError) throw moveError;

      // Reduce stock from source (reduce from first matching item)
      let remaining = qty;
      for (const item of (sourceItems || [])) {
        if (remaining <= 0) break;
        const reduce = Math.min(item.quantity, remaining);
        await supabase.from("inventory_items").update({ quantity: item.quantity - reduce }).eq("id", item.id);
        remaining -= reduce;
      }

      // Add/increase stock in destination
      const { data: destItems } = await supabase
        .from("inventory_items")
        .select("id, quantity")
        .eq("name", itemName)
        .eq("department", toDept as any)
        .limit(1);

      if (destItems && destItems.length > 0) {
        await supabase.from("inventory_items").update({ quantity: destItems[0].quantity + qty }).eq("id", destItems[0].id);
      } else {
        // Create new item in destination department
        const sourceItem = sourceItems?.[0];
        const { data: fullItem } = await supabase.from("inventory_items").select("*").eq("id", sourceItem?.id).single();
        if (fullItem) {
          await supabase.from("inventory_items").insert({
            name: fullItem.name,
            category: fullItem.category,
            model: fullItem.model,
            serial_number: null,
            quantity: qty,
            department: toDept as any,
            location: null,
            lecture_book_number: fullItem.lecture_book_number,
            low_stock_threshold: fullItem.low_stock_threshold,
            created_by: user.id,
            status: "available",
          });
        }
      }

      toast.success("Item moved successfully!");
      setDialogOpen(false);
      resetForm();
      fetchMovements();
    } catch (error: any) {
      toast.error(error.message || "Failed to move item");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setItemName(""); setLectureBookNumber(""); setFromDept(""); setToDept("");
    setQuantity("1"); setMovementDate(new Date().toISOString().split("T")[0]); setReason("");
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" />New Movement</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Move Item Between Departments</DialogTitle>
                  <DialogDescription>Transfer inventory from one department to another</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Item Name *</Label>
                      <Input value={itemName} onChange={e => setItemName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Lecture Book Number</Label>
                      <Input value={lectureBookNumber} onChange={e => setLectureBookNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>From Department *</Label>
                      <Select value={fromDept} onValueChange={setFromDept} required>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {ALL_DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>To Department *</Label>
                      <Select value={toDept} onValueChange={setToDept} required>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {ALL_DEPARTMENTS.filter(d => d !== fromDept).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Movement Date *</Label>
                      <Input type="date" value={movementDate} onChange={e => setMovementDate(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting}>{submitting ? "Moving..." : "Move Item"}</Button>
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
