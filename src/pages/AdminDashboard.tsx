import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Package, AlertTriangle, TrendingUp, 
  UserCheck, UserX, Clock, Shield, Edit, Trash2 
} from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingRequests: 0,
    totalItems: 0,
    lowStockItems: 0,
    activeAlerts: 0,
    departments: {
      emergency: 0,
      icu: 0,
      general: 0,
      pediatrics: 0,
      surgery: 0,
    }
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
      // Fetch all statistics
      const [itemsRes, alertsRes, requestsRes, profilesRes] = await Promise.all([
        supabase.from("inventory_items").select("*"),
        supabase.from("alerts").select("*").eq("is_resolved", false),
        supabase.from("registration_requests").select("*").eq("status", "pending"),
        supabase.from("profiles").select("*"),
      ]);

      const items = itemsRes.data || [];
      const alerts = alertsRes.data || [];
      const requests = requestsRes.data || [];
      const users = profilesRes.data || [];

      // Calculate department stats
      const deptStats = items.reduce((acc, item) => {
        acc[item.department] = (acc[item.department] || 0) + 1;
        return acc;
      }, {} as any);

      setStats({
        totalUsers: users.length,
        pendingRequests: requests.length,
        totalItems: items.length,
        lowStockItems: items.filter(i => i.quantity <= i.low_stock_threshold).length,
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
              <p className="text-xs text-muted-foreground mt-1">Items need restocking</p>
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
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="capitalize">{item.department}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>
                            <span className={item.quantity <= item.low_stock_threshold ? "text-destructive font-bold" : ""}>
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
                                onClick={() => navigate(`/item/${item.id}`)}
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent System Activity</CardTitle>
                <CardDescription>Latest alerts and system events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                        activity.severity === "high" ? "text-destructive" : 
                        activity.severity === "medium" ? "text-orange-500" : 
                        "text-yellow-500"
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={activity.is_resolved ? "default" : "destructive"}>
                            {activity.alert_type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(activity.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1">{activity.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => navigate("/users")}>
                <UserCheck className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
              <Button onClick={() => navigate("/add-item")}>
                <Package className="h-4 w-4 mr-2" />
                Add New Item
              </Button>
              <Button onClick={() => navigate("/alerts")}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                View All Alerts
              </Button>
              <Button onClick={() => navigate("/reports")}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Generate Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
