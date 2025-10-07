import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download } from "lucide-react";

const Reports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("inventory");
  const [department, setDepartment] = useState("all");
  const [format, setFormat] = useState("csv");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let query = supabase.from("inventory_items").select("*");
      
      if (department !== "all") {
        query = query.eq("department", department as any);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("No data available for the selected filters");
        return;
      }

      // Generate CSV
      if (format === "csv") {
        const headers = ["Name", "Category", "Model", "Serial Number", "Quantity", "Location", "Department", "Status"];
        const csvContent = [
          headers.join(","),
          ...data.map(item => [
            `"${item.name}"`,
            `"${item.category}"`,
            `"${item.model || ""}"`,
            `"${item.serial_number || ""}"`,
            item.quantity,
            `"${item.location || ""}"`,
            `"${item.department}"`,
            `"${item.status}"`,
          ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `inventory-report-${department}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      toast.success("Report generated successfully!");
    } catch (error: any) {
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const generateAlertsReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("alerts")
        .select(`
          *,
          inventory_items (
            name,
            department
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("No alerts data available");
        return;
      }

      // Generate CSV
      const headers = ["Alert Type", "Message", "Severity", "Item", "Department", "Status", "Created At"];
      const csvContent = [
        headers.join(","),
        ...data.map(alert => [
          `"${alert.alert_type}"`,
          `"${alert.message}"`,
          `"${alert.severity}"`,
          `"${alert.inventory_items?.name || "N/A"}"`,
          `"${alert.inventory_items?.department || "N/A"}"`,
          `"${alert.is_resolved ? "Resolved" : "Pending"}"`,
          `"${new Date(alert.created_at).toLocaleString()}"`,
        ].join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `alerts-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Alerts report generated successfully!");
    } catch (error: any) {
      toast.error("Failed to generate alerts report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate and download inventory reports</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Inventory Report
            </CardTitle>
            <CardDescription>Generate detailed inventory reports by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger id="report-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inventory">Inventory Items</SelectItem>
                      <SelectItem value="low-stock">Low Stock Items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department-filter">Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger id="department-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="AIDS">AIDS</SelectItem>
                      <SelectItem value="CSE">CSE</SelectItem>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                      <SelectItem value="Bio-tech">Bio-tech</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger id="format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel (Coming Soon)</SelectItem>
                      <SelectItem value="pdf">PDF (Coming Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={generateReport} disabled={loading} className="w-full gap-2">
                <Download className="h-4 w-4" />
                {loading ? "Generating..." : "Generate & Download Report"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Alerts Report
            </CardTitle>
            <CardDescription>Download a report of all system alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={generateAlertsReport} disabled={loading} className="w-full gap-2">
              <Download className="h-4 w-4" />
              {loading ? "Generating..." : "Generate Alerts Report"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
