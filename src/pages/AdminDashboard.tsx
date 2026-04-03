import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Package, AlertTriangle, TrendingUp, 
  UserCheck, Clock, Shield, Edit, Trash2, Search 
} from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

const ALL_DEPARTMENTS = Constants.public.Enums.department;
const ITEMS_PER_PAGE = 10;

async function fetchAllRows(table: "inventory_items" | "alerts" | "registration_requests" | "profiles", select: string, filters?: (q: any) => any) {
  let allData: any[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + batchSize - 1);
    if (filters) query = filters(query);
    const { data } = await query;
    if (!data || data.length === 0) break;
    allData = [...allData, ...data];
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return allData;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cabinFilter, setCabinFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingRequests: 0,
    totalItems: 0,
    lowStockItems: 0,
    activeAlerts: 0,
    departments: {} as Record<string, number>
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
    fetchAdminData();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roles || roles.role !== "admin") {
      toast.error("Access denied. Admin only.");
      navigate("/dashboard");
    }
  };

  const fetchAdminData = async () => {
    try {
      const [items, alerts, requests, users] = await Promise.all([
        fetchAllRows("inventory_items", "*"),
        fetchAllRows("alerts", "*", (q: any) => q.eq("is_resolved", false)),
        fetchAllRows("registration_requests", "*", (q: any) => q.eq("status", "pending")),
        fetchAllRows("profiles", "*"),
      ]);

      // Calculate department stats
      const deptStats = items.reduce((acc: any, item: any) => {
        acc[item.department] = (acc[item.department] || 0) + 1;
        return acc;
      }, {} as any);

      // Aggregate items by name+department for accurate low stock count
      const itemAggregates = new Map<string, { totalQty: number; threshold: number }>();
      items.forEach((item: any) => {
        const key = `${item.department}|${item.name}`;
        if (!itemAggregates.has(key)) {
          itemAggregates.set(key, { totalQty: 0, threshold: item.low_stock_threshold || 5 });
        }
        itemAggregates.get(key)!.totalQty += item.quantity;
      });
      
      let lowStockCount = 0;
      itemAggregates.forEach(agg => {
        if (agg.totalQty <= agg.threshold) lowStockCount++;
      });

      setStats({
        totalUsers: users.length,
        pendingRequests: requests.length,
        totalItems: items.length,
        lowStockItems: lowStockCount,
        activeAlerts: alerts.length,
        departments: deptStats,
      });

      setAllItems(items);

      // Fetch recent activity (last 10 alerts)
      const { data: recentAlerts } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentActivity(recentAlerts || []);
    } catch (error: any) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast.success("Item deleted successfully");
      fetchAdminData();
    } catch (error: any) {
      toast.error("Failed to delete item");
    }
  };

  const uniqueCabins = useMemo(() => {
    const cabins = new Set<string>();
    allItems.forEach((item) => {
      if (item.cabin_number) cabins.add(item.cabin_number);
    });
    return Array.from(cabins).sort();
  }, [allItems]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === "" || 
        item.name?.toLowerCase().includes(q) ||
        item.model?.toLowerCase().includes(q) ||
        item.serial_number?.toLowerCase().includes(q) ||
        item.cabin_number?.toLowerCase().includes(q) ||
        item.lecture_book_number?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        (String(item.quantity) === searchQuery.trim());
      
      const matchesDepartment = departmentFilter === "all" || item.department === departmentFilter;
      const matchesStatus = statusFilter === "all" || item.item_status === statusFilter;
      const matchesCabin = cabinFilter === "all" || item.cabin_number === cabinFilter;
      
      return matchesSearch && matchesDepartment && matchesStatus && matchesCabin;
    });
  }, [allItems, searchQuery, departmentFilter, statusFilter, cabinFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, departmentFilter, statusFilter, cabinFilter]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "ellipsis", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages);
      }
    }
    return pages;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary-glow to-background p-8 border border-primary/30 shadow-glow">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3 text-primary-foreground">
                <Shield className="h-10 w-10" />
                Admin Dashboard
              </h1>
              <p className="text-primary-foreground/80 mt-2 text-lg">
                Complete system overview and management
              </p>
            </div>
            <Button onClick={() => navigate("/users")} size="lg" variant="secondary">
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-glow/30 rounded-full blur-3xl -z-0" />
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="hover-lift border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                {stats.totalUsers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pendingRequests} pending requests
              </p>
            </CardContent>
          </Card>

          <Card className="hover-lift border-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">
                {stats.totalItems}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across all departments</p>
            </CardContent>
          </Card>

          <Card className="hover-lift border-destructive/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.lowStockItems}</div>
              <p className="text-xs text-muted-foreground mt-1">Items below 10 units</p>
            </CardContent>
          </Card>

          <Card className="hover-lift border-alert/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-alert" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-alert">{stats.activeAlerts}</div>
              <p className="text-xs text-muted-foreground mt-1">Unresolved issues</p>
            </CardContent>
          </Card>

          <Card className="hover-lift border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-secondary-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">Need approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Department Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Department Inventory Overview</CardTitle>
            <CardDescription>Item count by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {Object.entries(stats.departments).map(([dept, count]) => (
                <div key={dept} className="flex flex-col items-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{count as number}</div>
                  <div className="text-sm text-muted-foreground capitalize">{dept}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for detailed management */}
        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">All Items</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Inventory Items</CardTitle>
                <CardDescription>Manage items across all departments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, model, serial number, ledger book, cabin, category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {ALL_DEPARTMENTS.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="working">Working</SelectItem>
                        <SelectItem value="scrap">Scrap</SelectItem>
                        <SelectItem value="outdated">Outdated</SelectItem>
                        <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={cabinFilter} onValueChange={setCabinFilter}>
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="Cabin Number" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cabins</SelectItem>
                        {uniqueCabins.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Ledger Book</TableHead>
                        <TableHead>Cabin No.</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No items found
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="capitalize">{item.department}</TableCell>
                            <TableCell>
                              <span className={item.quantity < 10 ? "text-destructive font-bold" : ""}>
                                {item.quantity}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.status === "available" ? "default" : "secondary"}>
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/inventory/${item.id}`)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length} items
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {getPageNumbers().map((page, index) => (
                          <PaginationItem key={index}>
                            {page === "ellipsis" ? (
                              <span className="px-2">...</span>
                            ) : (
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivity.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Badge variant="outline">{alert.alert_type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">{alert.message}</TableCell>
                        <TableCell>
                          <Badge variant={alert.severity === "high" ? "destructive" : "secondary"}>
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={alert.is_resolved ? "default" : "outline"} className={alert.is_resolved ? "bg-success" : ""}>
                            {alert.is_resolved ? "Resolved" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(alert.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                    {recentActivity.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No recent activity
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
