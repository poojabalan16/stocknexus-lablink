import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CalendarIcon, Upload, X, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const VENDOR_CATEGORIES = [
  { value: "asset_vendor", label: "Asset Vendor" },
  { value: "service_provider", label: "Service Provider" },
  { value: "utility", label: "Utility" },
  { value: "software_vendor", label: "Software Vendor" },
  { value: "other", label: "Other" },
];

const PURCHASE_TYPES = [
  { value: "asset", label: "Asset" },
  { value: "consumable", label: "Consumable" },
  { value: "service", label: "Service" },
  { value: "subscription", label: "Subscription" },
  { value: "utility", label: "Utility" },
];

const ITEM_CATEGORIES = [
  { value: "hardware", label: "Hardware" },
  { value: "network", label: "Network" },
  { value: "software", label: "Software" },
  { value: "office", label: "Office" },
  { value: "lab", label: "Lab" },
  { value: "other", label: "Other" },
];

const BILLING_PERIODS = [
  { value: "one_time", label: "One-time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "neft", label: "NEFT" },
  { value: "rtgs", label: "RTGS" },
  { value: "upi", label: "UPI" },
];

const PAYMENT_STATUSES = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "partially_paid", label: "Partially Paid" },
];

const DEPARTMENTS = [
  "IT", "AI&DS", "CSE", "ECE", "EEE", "Physics", "Chemistry", "Bio-tech",
  "Chemical", "Mechanical", "CIVIL", "CSBS", "MBA", "Accounts", "Exam Cell", "Library",
  "Main Stock",
];

const AddPurchase = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Vendor
  const [vendorName, setVendorName] = useState("");
  const [vendorCategory, setVendorCategory] = useState("");
  const [vendorGst, setVendorGst] = useState("");
  const [vendorContact, setVendorContact] = useState("");

  // Classification
  const [purchaseType, setPurchaseType] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");

  // Billing
  const [billNumber, setBillNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>();
  const [billingPeriod, setBillingPeriod] = useState("one_time");
  const [referenceOrder, setReferenceOrder] = useState("");

  // Financial
  const [baseAmount, setBaseAmount] = useState("0");
  const [gstApplicable, setGstApplicable] = useState(false);
  const [gstPercentage, setGstPercentage] = useState("18");

  // Payment
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [dueDate, setDueDate] = useState<Date>();

  // Org
  const [department, setDepartment] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [remarks, setRemarks] = useState("");

  // Files
  const [files, setFiles] = useState<File[]>([]);

  // Computed
  const gstAmount = gstApplicable ? (parseFloat(baseAmount || "0") * parseFloat(gstPercentage || "0")) / 100 : 0;
  const totalAmount = parseFloat(baseAmount || "0") + gstAmount;

  const isQuantityEnabled = purchaseType === "asset" || purchaseType === "consumable";

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
      if (!roles || roles.role !== "admin") {
        toast.error("Access denied. Only admins can add purchases.");
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(f => ["application/pdf", "image/jpeg", "image/png"].includes(f.type));
    if (valid.length !== selected.length) toast.error("Only PDF, JPG, PNG files are allowed");
    setFiles(prev => [...prev, ...valid]);
  };

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName || !vendorCategory || !purchaseType || !itemCategory || !itemName || !billNumber || !invoiceDate || !paymentMode || !department || !purchaseDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: purchase, error } = await supabase.from("purchases").insert({
        vendor_name: vendorName.trim(),
        vendor_category: vendorCategory as any,
        vendor_gst_number: vendorGst || null,
        vendor_contact: vendorContact || null,
        purchase_type: purchaseType as any,
        item_category: itemCategory as any,
        item_name: itemName.trim(),
        item_description: itemDescription || null,
        quantity: isQuantityEnabled ? parseInt(quantity) : 1,
        unit_price: parseFloat(unitPrice) || 0,
        bill_invoice_number: billNumber.trim(),
        invoice_date: format(invoiceDate, "yyyy-MM-dd"),
        billing_period: billingPeriod as any,
        reference_order_number: referenceOrder || null,
        base_amount: parseFloat(baseAmount) || 0,
        gst_applicable: gstApplicable,
        gst_percentage: gstApplicable ? parseFloat(gstPercentage) : 0,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        payment_mode: paymentMode as any,
        payment_status: paymentStatus as any,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        department: department as any,
        purchase_date: format(purchaseDate, "yyyy-MM-dd"),
        remarks: remarks || null,
        created_by: user.id,
      }).select().single();

      if (error) {
        if (error.message.includes("duplicate key")) {
          toast.error("A purchase with this Bill/Invoice Number already exists for this vendor");
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      // Upload files
      if (files.length > 0 && purchase) {
        for (const file of files) {
          const filePath = `${purchase.id}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage.from("purchase-bills").upload(filePath, file);
          if (uploadError) { console.error("Upload error:", uploadError); continue; }
          const { data: { publicUrl } } = supabase.storage.from("purchase-bills").getPublicUrl(filePath);
          await supabase.from("purchase_attachments").insert({
            purchase_id: purchase.id,
            file_url: filePath,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user.id,
          });
        }
      }

      toast.success("Purchase recorded successfully!");
      navigate("/purchases");
    } catch (error: any) {
      toast.error(error.message || "Failed to add purchase");
    } finally {
      setLoading(false);
    }
  };

  const DatePickerField = ({ label, date, onSelect, required }: { label: string; date?: Date; onSelect: (d: Date | undefined) => void; required?: boolean }) => (
    <div className="space-y-2">
      <Label>{label} {required && "*"}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add Purchase</h1>
            <p className="text-muted-foreground">Record a new purchase with billing details</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Vendor Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Vendor Details</CardTitle>
              <CardDescription>Enter vendor/supplier information</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor Name *</Label>
                <Input value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="Enter vendor name" required />
              </div>
              <div className="space-y-2">
                <Label>Vendor Category *</Label>
                <Select value={vendorCategory} onValueChange={setVendorCategory} required>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {VENDOR_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vendor GST Number</Label>
                <Input value={vendorGst} onChange={e => setVendorGst(e.target.value)} placeholder="e.g. 29ABCDE1234F1Z5" />
              </div>
              <div className="space-y-2">
                <Label>Vendor Contact</Label>
                <Input value={vendorContact} onChange={e => setVendorContact(e.target.value)} placeholder="Phone or email" />
              </div>
            </CardContent>
          </Card>

          {/* 2. Purchase Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Purchase Classification</CardTitle>
              <CardDescription>Classify the purchase type and item details</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Type *</Label>
                <Select value={purchaseType} onValueChange={setPurchaseType} required>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {PURCHASE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Item Category *</Label>
                <Select value={itemCategory} onValueChange={setItemCategory} required>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {ITEM_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Item / Service Name *</Label>
                <Input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Enter item or service name" required />
              </div>
              <div className="space-y-2">
                <Label>Item Description</Label>
                <Input value={itemDescription} onChange={e => setItemDescription(e.target.value)} placeholder="Brief description" />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} disabled={!isQuantityEnabled} />
              </div>
              <div className="space-y-2">
                <Label>Unit Price (₹)</Label>
                <Input type="number" min="0" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* 3. Billing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Billing Information</CardTitle>
              <CardDescription>Mandatory invoice and billing details</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bill / Invoice Number *</Label>
                <Input value={billNumber} onChange={e => setBillNumber(e.target.value)} placeholder="e.g. INV-2026-001" required />
              </div>
              <DatePickerField label="Invoice Date" date={invoiceDate} onSelect={setInvoiceDate} required />
              <div className="space-y-2">
                <Label>Billing Period *</Label>
                <Select value={billingPeriod} onValueChange={setBillingPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BILLING_PERIODS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference Order Number</Label>
                <Input value={referenceOrder} onChange={e => setReferenceOrder(e.target.value)} placeholder="Optional PO number" />
              </div>
            </CardContent>
          </Card>

          {/* 4. Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Financial Details</CardTitle>
              <CardDescription>Amount, tax and total calculations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Amount (Before Tax) *</Label>
                  <Input type="number" min="0" step="0.01" value={baseAmount} onChange={e => setBaseAmount(e.target.value)} required />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <Label>GST Applicable</Label>
                  <Switch checked={gstApplicable} onCheckedChange={setGstApplicable} />
                </div>
                {gstApplicable && (
                  <>
                    <div className="space-y-2">
                      <Label>GST Percentage (%)</Label>
                      <Input type="number" min="0" max="100" step="0.5" value={gstPercentage} onChange={e => setGstPercentage(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>GST Amount (Auto-calculated)</Label>
                      <Input value={`₹ ${gstAmount.toFixed(2)}`} disabled />
                    </div>
                  </>
                )}
              </div>
              <div className="rounded-lg bg-muted p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Payable Amount</span>
                  <span className="text-2xl font-bold text-primary">₹ {totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">5. Payment Details</CardTitle>
              <CardDescription>Payment mode and status</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode} required>
                  <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Status *</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DatePickerField label="Due Date" date={dueDate} onSelect={setDueDate} />
            </CardContent>
          </Card>

          {/* 6. Bill Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">6. Bill Upload</CardTitle>
              <CardDescription>Upload invoice/bill documents (PDF, JPG, PNG)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <Label htmlFor="bill-upload" className="cursor-pointer">
                  <span className="text-sm font-medium text-primary hover:underline">Click to upload files</span>
                  <Input id="bill-upload" type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden" onChange={handleFileChange} />
                </Label>
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 10MB each</p>
              </div>
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 7. Organizational Mapping */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">7. Organizational Mapping</CardTitle>
              <CardDescription>Department and date information</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={department} onValueChange={setDepartment} required>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DatePickerField label="Purchase Date" date={purchaseDate} onSelect={(d) => d && setPurchaseDate(d)} required />
              <div className="md:col-span-2 space-y-2">
                <Label>Remarks / Notes</Label>
                <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any additional notes..." rows={3} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="min-w-[160px]">
              {loading ? "Saving..." : "Save Purchase"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AddPurchase;
