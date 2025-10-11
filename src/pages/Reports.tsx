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
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

      const { data: rawData, error } = await query;
      if (error) throw error;

      // Filter for low stock if needed
      let data = rawData;
      if (reportType === "low-stock") {
        data = rawData?.filter(item => item.quantity <= (item.low_stock_threshold || 5));
      }

      if (!data || data.length === 0) {
        toast.error("No data available for the selected filters");
        return;
      }

      const fileName = `inventory-report-${department}-${new Date().toISOString().split('T')[0]}`;
      const headers = ["Name", "Category", "Model", "Serial Number", "Quantity", "Location", "Department", "Status"];
      
      if (format === "csv") {
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
        a.download = `${fileName}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (format === "excel") {
        const worksheetData = [
          headers,
          ...data.map(item => [
            item.name,
            item.category,
            item.model || "",
            item.serial_number || "",
            item.quantity,
            item.location || "",
            item.department,
            item.status,
          ])
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

        // Set column widths
        worksheet["!cols"] = [
          { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
          { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 15 }
        ];

        XLSX.writeFile(workbook, `${fileName}.xlsx`);
      } else if (format === "pdf") {
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text("Inventory Report", 14, 20);
        doc.setFontSize(11);
        doc.text(`Department: ${department === "all" ? "All Departments" : department}`, 14, 30);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);

        autoTable(doc, {
          head: [headers],
          body: data.map(item => [
            item.name,
            item.category,
            item.model || "",
            item.serial_number || "",
            item.quantity,
            item.location || "",
            item.department,
            item.status,
          ]),
          startY: 45,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
        });

        doc.save(`${fileName}.pdf`);
      }

      toast.success("Report generated successfully!");
    } catch (error: any) {
      toast.error("Failed to generate report");
      console.error(error);
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

      const fileName = `alerts-report-${new Date().toISOString().split('T')[0]}`;
      const headers = ["Alert Type", "Message", "Severity", "Item", "Department", "Status", "Created At"];

      if (format === "csv") {
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
        a.download = `${fileName}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (format === "excel") {
        const worksheetData = [
          headers,
          ...data.map(alert => [
            alert.alert_type,
            alert.message,
            alert.severity,
            alert.inventory_items?.name || "N/A",
            alert.inventory_items?.department || "N/A",
            alert.is_resolved ? "Resolved" : "Pending",
            new Date(alert.created_at).toLocaleString(),
          ])
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Alerts");

        worksheet["!cols"] = [
          { wch: 15 }, { wch: 50 }, { wch: 10 }, { wch: 25 },
          { wch: 15 }, { wch: 10 }, { wch: 20 }
        ];

        XLSX.writeFile(workbook, `${fileName}.xlsx`);
      } else if (format === "pdf") {
        const doc = new jsPDF('landscape');
        
        doc.setFontSize(18);
        doc.text("Alerts Report", 14, 20);
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

        autoTable(doc, {
          head: [headers],
          body: data.map(alert => [
            alert.alert_type,
            alert.message,
            alert.severity,
            alert.inventory_items?.name || "N/A",
            alert.inventory_items?.department || "N/A",
            alert.is_resolved ? "Resolved" : "Pending",
            new Date(alert.created_at).toLocaleString(),
          ]),
          startY: 40,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
          columnStyles: {
            1: { cellWidth: 80 }
          }
        });

        doc.save(`${fileName}.pdf`);
      }

      toast.success("Alerts report generated successfully!");
    } catch (error: any) {
      toast.error("Failed to generate alerts report");
      console.error(error);
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
                      <SelectItem value="excel">Excel (XLSX)</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
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
