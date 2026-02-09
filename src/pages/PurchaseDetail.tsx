import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Edit, Trash2, Eye, Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ItemDetailSkeleton } from "@/components/skeletons/ItemDetailSkeleton";

const formatLabel = (s: string) => s?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";

const PurchaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const { data: purchase, isLoading } = useQuery({
    queryKey: ["purchase", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, purchase_attachments(id, file_name, file_url, file_type, file_size)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleEdit = () => {
    setEditForm({
      payment_status: purchase?.payment_status,
      remarks: purchase?.remarks || "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase.from("purchases").update({
        payment_status: editForm.payment_status,
        remarks: editForm.remarks,
      }).eq("id", id);
      if (error) throw error;
      toast.success("Purchase updated");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["purchase", id] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("purchases").update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id,
      }).eq("id", id);
      if (error) throw error;
      toast.success("Purchase deleted (soft)");
      navigate("/purchases");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleViewFile = async (fileUrl: string) => {
    const { data } = await supabase.storage.from("purchase-bills").createSignedUrl(fileUrl, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (isLoading) return <DashboardLayout><ItemDetailSkeleton /></DashboardLayout>;
  if (!purchase) return <DashboardLayout><div className="text-center py-8">Purchase not found</div></DashboardLayout>;

  const InfoRow = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium text-sm text-right">{value || "—"}</span>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/purchases")}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-2xl font-bold">{purchase.item_name}</h1>
              <p className="text-muted-foreground">Bill: {purchase.bill_invoice_number}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleEdit}><Edit className="mr-2 h-4 w-4" />Edit</Button>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Purchase</DialogTitle>
                  <DialogDescription>This will soft-delete the purchase record for audit safety. Continue?</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {editing ? (
          <Card>
            <CardHeader><CardTitle>Edit Purchase</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={editForm.payment_status} onValueChange={v => setEditForm({ ...editForm, payment_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea value={editForm.remarks} onChange={e => setEditForm({ ...editForm, remarks: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave}>Save</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Vendor Details</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Vendor Name" value={purchase.vendor_name} />
                <InfoRow label="Category" value={formatLabel(purchase.vendor_category)} />
                <InfoRow label="GST Number" value={purchase.vendor_gst_number} />
                <InfoRow label="Contact" value={purchase.vendor_contact} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Purchase Classification</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Purchase Type" value={<Badge variant="secondary">{formatLabel(purchase.purchase_type)}</Badge>} />
                <InfoRow label="Item Category" value={formatLabel(purchase.item_category)} />
                <InfoRow label="Item Name" value={purchase.item_name} />
                <InfoRow label="Description" value={purchase.item_description} />
                <InfoRow label="Quantity" value={purchase.quantity} />
                <InfoRow label="Unit Price" value={`₹ ${parseFloat(String(purchase.unit_price)).toFixed(2)}`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Billing & Financial</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Bill/Invoice No." value={purchase.bill_invoice_number} />
                <InfoRow label="Invoice Date" value={new Date(purchase.invoice_date).toLocaleDateString("en-IN")} />
                <InfoRow label="Billing Period" value={formatLabel(purchase.billing_period)} />
                <InfoRow label="Ref Order No." value={purchase.reference_order_number} />
                <InfoRow label="Base Amount" value={`₹ ${parseFloat(String(purchase.base_amount)).toFixed(2)}`} />
                <InfoRow label="GST" value={purchase.gst_applicable ? `${purchase.gst_percentage}% = ₹ ${parseFloat(String(purchase.gst_amount)).toFixed(2)}` : "N/A"} />
                <div className="flex justify-between py-2 bg-muted rounded px-2 mt-2">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-primary">₹ {parseFloat(String(purchase.total_amount)).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Payment & Organization</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Payment Mode" value={formatLabel(purchase.payment_mode)} />
                <InfoRow label="Payment Status" value={<Badge variant={purchase.payment_status === "paid" ? "default" : "outline"}>{formatLabel(purchase.payment_status)}</Badge>} />
                <InfoRow label="Due Date" value={purchase.due_date ? new Date(purchase.due_date).toLocaleDateString("en-IN") : "—"} />
                <InfoRow label="Department" value={purchase.department} />
                <InfoRow label="Purchase Date" value={new Date(purchase.purchase_date).toLocaleDateString("en-IN")} />
                <InfoRow label="Remarks" value={purchase.remarks} />
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Uploaded Bills</CardTitle></CardHeader>
              <CardContent>
                {purchase.purchase_attachments?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {purchase.purchase_attachments.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-3 rounded-md border p-3">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.file_name}</p>
                          <p className="text-xs text-muted-foreground">{a.file_type}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleViewFile(a.file_url)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No bills uploaded</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PurchaseDetail;
