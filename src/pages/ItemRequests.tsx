import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList, Plus, Search, Check, X } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

const ALL_DEPARTMENTS = [
  "IT", "AI&DS", "CSE", "Physics", "Chemistry", "Bio-tech", "Chemical",
  "Mechanical", "Accounts", "Exam Cell", "Library", "ECE", "EEE", "CIVIL", "CSBS", "MBA",
];

const ItemRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Form state
  const [requestingDept, setRequestingDept] = useState("");
  const [requestedFromDept, setRequestedFromDept] = useState("");
  const [itemName, setItemName] = useState("");
  const [lectureBookNumber, setLectureBookNumber] = useState("");
  const [quantityRequested, setQuantityRequested] = useState("1");
  const [priority, setPriority] = useState("medium");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchRequests();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    setUserId(user.id);
    const { data: roles } = await supabase.from("user_roles").select("role, department").eq("user_id", user.id).single();
    if (roles) {
      setUserRole(roles.role);
      if (roles.role !== "admin" && roles.department) setRequestingDept(roles.department);
    }
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("item_requests")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (!error) setRequests(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestingDept === requestedFromDept) { toast.error("Departments must be different"); return; }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("item_requests").insert({
        requesting_department: requestingDept as any,
        requested_from_department: requestedFromDept as any,
        item_name: itemName,
        lecture_book_number: lectureBookNumber || null,
        quantity_requested: parseInt(quantityRequested),
        priority,
        remarks: remarks || null,
        requested_by: user.id,
      });
      if (error) throw error;

      toast.success("Request submitted!");
      setDialogOpen(false);
      resetForm();
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("item_requests").update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      }).eq("id", requestId);
      toast.success("Request approved");
      fetchRequests();
    } catch { toast.error("Failed to approve"); }
  };

  const handleReject = async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("item_requests").update({
        status: "rejected",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      }).eq("id", requestId);
      toast.success("Request rejected");
      fetchRequests();
    } catch { toast.error("Failed to reject"); }
  };

  const resetForm = () => {
    setItemName(""); setLectureBookNumber(""); setRequestedFromDept("");
    setQuantityRequested("1"); setPriority("medium"); setRemarks("");
  };

  const getPriorityBadge = (p: string) => {
    if (p === "high") return <Badge variant="destructive">High</Badge>;
    if (p === "medium") return <Badge variant="outline" className="border-alert text-alert">Medium</Badge>;
    return <Badge variant="secondary">Low</Badge>;
  };

  const getStatusBadge = (s: string) => {
    const map: Record<string, { variant: any; className?: string }> = {
      pending: { variant: "outline" },
      approved: { variant: "default", className: "bg-success" },
      rejected: { variant: "destructive" },
      completed: { variant: "default", className: "bg-primary" },
    };
    const config = map[s] || { variant: "outline" };
    return <Badge variant={config.variant} className={config.className}>{s.charAt(0).toUpperCase() + s.slice(1)}</Badge>;
  };

  const filtered = requests.filter(r => {
    const matchSearch = r.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requesting_department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.lecture_book_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Item Requests</h1>
            <p className="text-muted-foreground">Inter-department item request management</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />New Request</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Item Request</DialogTitle>
                <DialogDescription>Request items from another department</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Requesting Department *</Label>
                    <Select value={requestingDept} onValueChange={setRequestingDept} required disabled={userRole !== "admin"}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {ALL_DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Requested From *</Label>
                    <Select value={requestedFromDept} onValueChange={setRequestedFromDept} required>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {ALL_DEPARTMENTS.filter(d => d !== requestingDept).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Item Name *</Label>
                    <Input value={itemName} onChange={e => setItemName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Lecture Book Number</Label>
                    <Input value={lectureBookNumber} onChange={e => setLectureBookNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input type="number" min="1" value={quantityRequested} onChange={e => setQuantityRequested(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority *</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />All Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search requests..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loading ? <TableSkeleton rows={6} columns={8} /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>LBN</TableHead>
                    <TableHead>From Dept</TableHead>
                    <TableHead>To Dept</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    {userRole === "admin" && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{r.item_name}</TableCell>
                      <TableCell><Badge variant="outline">{r.lecture_book_number || "-"}</Badge></TableCell>
                      <TableCell>{r.requested_from_department}</TableCell>
                      <TableCell>{r.requesting_department}</TableCell>
                      <TableCell>{r.quantity_requested}</TableCell>
                      <TableCell>{getPriorityBadge(r.priority)}</TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      {userRole === "admin" && (
                        <TableCell>
                          {r.status === "pending" && (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleApprove(r.id)}>
                                <Check className="h-4 w-4 text-success" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleReject(r.id)}>
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No requests found</TableCell></TableRow>
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

export default ItemRequests;
