import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { StatsGridSkeleton } from "@/components/skeletons/StatsCardSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Plus, Search, Filter, CalendarIcon, Eye, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Purchases = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const { data: purchases, isLoading } = useQuery({
    queryKey: ["purchases", typeFilter, deptFilter, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("purchases")
        .select("*, purchase_attachments(id, file_name, file_url)")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") query = query.eq("purchase_type", typeFilter as any);
      if (deptFilter !== "all") query = query.eq("department", deptFilter as any);
      if (statusFilter !== "all") query = query.eq("payment_status", statusFilter as any);
      if (dateFrom) query = query.gte("purchase_date", format(dateFrom, "yyyy-MM-dd"));
      if (dateTo) query = query.lte("purchase_date", format(dateTo, "yyyy-MM-dd"));

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filtered = purchases?.filter(p =>
    !search || [p.vendor_name, p.item_name, p.bill_invoice_number, p.department]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: filtered?.length || 0,
    totalAmount: filtered?.reduce((s, p) => s + (parseFloat(String(p.total_amount)) || 0), 0) || 0,
    paid: filtered?.filter(p => p.payment_status === "paid").length || 0,
    pending: filtered?.filter(p => p.payment_status === "pending").length || 0,
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      paid: "default", pending: "outline", partially_paid: "secondary",
    };
    return map[status] || "outline";
  };

  const formatLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const handleViewBill = async (fileUrl: string) => {
    const { data } = await supabase.storage.from("purchase-bills").createSignedUrl(fileUrl, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Purchase & Bill Management</h1>
            <p className="text-muted-foreground mt-1">Track all purchases, invoices and payments</p>
          </div>
          <Button onClick={() => navigate("/purchases/add")}>
            <Plus className="mr-2 h-4 w-4" /> Add Purchase
          </Button>
        </div>

        {/* Stats */}
        {isLoading ? <StatsGridSkeleton /> : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
            <Card className="hover-lift">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Purchases</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
            </Card>
            <Card className="hover-lift">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Amount</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">₹ {stats.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div></CardContent>
            </Card>
            <Card className="hover-lift">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Paid</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{stats.paid}</div></CardContent>
            </Card>
            <Card className="hover-lift">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{stats.pending}</div></CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle>Purchase Records</CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search purchases..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 mb-4 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="consumable">Consumable</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                </SelectContent>
              </Select>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depts</SelectItem>
                  {["IT","AI&DS","CSE","Physics","Chemistry","Bio-tech","Chemical","Mechanical","Accounts","Exam Cell","Library"].map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(!dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {dateFrom ? format(dateFrom, "dd MMM yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(!dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {dateTo ? format(dateTo, "dd MMM yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              {(dateFrom || dateTo || typeFilter !== "all" || deptFilter !== "all" || statusFilter !== "all") && (
                <Button variant="ghost" size="sm" onClick={() => { setTypeFilter("all"); setDeptFilter("all"); setStatusFilter("all"); setDateFrom(undefined); setDateTo(undefined); }}>
                  Clear
                </Button>
              )}
            </div>

            {isLoading ? <TableSkeleton rows={5} columns={9} /> : filtered && filtered.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Item / Service</TableHead>
                      <TableHead>Bill No.</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Total (₹)</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Bill</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell><Badge variant="secondary">{formatLabel(p.purchase_type)}</Badge></TableCell>
                        <TableCell className="font-medium">{p.vendor_name}</TableCell>
                        <TableCell>{p.item_name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.bill_invoice_number}</TableCell>
                        <TableCell>{p.department}</TableCell>
                        <TableCell className="text-right font-medium">₹ {parseFloat(p.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell><Badge variant={getStatusBadge(p.payment_status)}>{formatLabel(p.payment_status)}</Badge></TableCell>
                        <TableCell>{new Date(p.purchase_date).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell>
                          {p.purchase_attachments?.length > 0 ? (
                            <div className="flex gap-1">
                              {p.purchase_attachments.map((a: any) => (
                                <Button key={a.id} variant="ghost" size="icon" onClick={() => handleViewBill(a.file_url)} title={a.file_name}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              ))}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">None</span>}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/purchases/${p.id}`)}>View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No purchases found. Add your first purchase to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Purchases;
