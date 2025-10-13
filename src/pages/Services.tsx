import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Services = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string | Database["public"]["Enums"]["service_type"]>("all");
  const [statusFilter, setStatusFilter] = useState<string | Database["public"]["Enums"]["service_status"]>("all");

  // Fetch services with equipment details
  const { data: services, isLoading, refetch } = useQuery({
    queryKey: ["services", serviceTypeFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("services")
        .select(`
          *,
          inventory_items (
            name,
            category,
            model
          )
        `)
        .order("created_at", { ascending: false });

      if (serviceTypeFilter !== "all") {
        query = query.eq("service_type", serviceTypeFilter as Database["public"]["Enums"]["service_type"]);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as Database["public"]["Enums"]["service_status"]);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load services",
          variant: "destructive",
        });
        throw error;
      }

      return data;
    },
  });

  // Calculate analytics
  const analytics = {
    total: services?.length || 0,
    internal: services?.filter((s) => s.service_type === "internal").length || 0,
    external: services?.filter((s) => s.service_type === "external").length || 0,
    completed: services?.filter((s) => s.status === "completed").length || 0,
    pending: services?.filter((s) => s.status === "pending").length || 0,
    inProgress: services?.filter((s) => s.status === "in_progress").length || 0,
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatServiceType = (type: string) => {
    return type === "internal" ? "Internal" : "External";
  };

  const formatNatureOfService = (nature: string) => {
    return nature.charAt(0).toUpperCase() + nature.slice(1);
  };

  const formatStatus = (status: string) => {
    return status === "in_progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Service Registration</h1>
            <p className="text-muted-foreground mt-1">
              Manage equipment maintenance and repair services
            </p>
          </div>
          <Button onClick={() => navigate("/services/add")}>
            <Plus className="mr-2 h-4 w-4" />
            Register Service
          </Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Internal Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.internal}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">External Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.external}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Service Records</CardTitle>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Service Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="external">External</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading services...</div>
            ) : services && services.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Nature</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Technician/Vendor</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service: any) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">
                          {service.inventory_items?.name || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={service.service_type === "internal" ? "secondary" : "outline"}>
                            {formatServiceType(service.service_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatNatureOfService(service.nature_of_service)}</TableCell>
                        <TableCell className="capitalize">{service.department}</TableCell>
                        <TableCell>{new Date(service.service_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(service.status)}>
                            {formatStatus(service.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{service.technician_vendor_name}</TableCell>
                        <TableCell>
                          {service.cost ? `₹${parseFloat(service.cost).toFixed(2)}` : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/services/${service.id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No services found. Register your first service to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Services;
