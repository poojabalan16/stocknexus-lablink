import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Package, ArrowLeft, Upload } from "lucide-react";
import * as XLSX from 'xlsx';

const AddItem = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  // Bulk import state
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, department")
      .eq("user_id", user.id)
      .single();

    if (!roles || (roles.role !== "admin" && roles.role !== "hod")) {
      toast.error("Access denied. Only admins and HODs can add items.");
      navigate("/dashboard");
      return;
    }

    setUserRole(roles.role);
    setUserDepartment(roles.department);

    // If HOD, pre-select their department
    if (roles.role === "hod" && roles.department) {
      setDepartment(roles.department);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Parse specifications if provided
      let specsObj = {};
      if (specifications.trim()) {
        try {
          specsObj = JSON.parse(specifications);
        } catch {
          toast.error("Invalid JSON format for specifications");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from("inventory_items")
        .insert({
          name,
          category,
          model: model || null,
          serial_number: serialNumber || null,
          quantity: parseInt(quantity),
          low_stock_threshold: parseInt(lowStockThreshold),
          location: location || null,
          department: department as any,
          specifications: specsObj,
          created_by: user.id,
          status: "available",
          unit_price: unitPrice ? parseFloat(unitPrice) : 0,
        });

      if (error) throw error;

      toast.success("Item added successfully!");
      navigate(`/departments/${department}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  const parseExcelFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsBinaryString(file);
    });
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error("Please select a file");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let parsedData: any[] = [];
      
      // Handle Excel files
      if (importFile.name.endsWith('.xlsx') || importFile.name.endsWith('.xls')) {
        parsedData = await parseExcelFile(importFile);
      } 
      // Handle CSV files
      else {
        const text = await importFile.text();
        const lines = text.split("\n").filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error("CSV file is empty or has no data rows");
          setLoading(false);
          return;
        }

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        parsedData = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim());
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index];
          });
          parsedData.push(row);
        }
      }

      if (parsedData.length === 0) {
        toast.error("No data found in file");
        setLoading(false);
        return;
      }

      // Validate required fields
      const requiredFields = ["name", "category", "department", "quantity"];
      const firstRow = parsedData[0];
      const availableFields = Object.keys(firstRow).map(k => k.toLowerCase());
      const missingFields = requiredFields.filter(field => !availableFields.includes(field));
      
      if (missingFields.length > 0) {
        toast.error(`Missing required columns: ${missingFields.join(", ")}`);
        setLoading(false);
        return;
      }

      // Map data to items
      const items = parsedData.map((row: any) => {
        const normalizedRow: any = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase()] = row[key];
        });

        const item: any = {
          created_by: user.id,
          status: "available",
          name: normalizedRow.name,
          category: normalizedRow.category,
          department: normalizedRow.department,
          quantity: parseInt(normalizedRow.quantity) || 1,
          model: normalizedRow.model || null,
          serial_number: normalizedRow.serial_number || normalizedRow.serialnumber || null,
          low_stock_threshold: parseInt(normalizedRow.low_stock_threshold || normalizedRow.lowstockthreshold || normalizedRow.threshold) || 5,
          location: normalizedRow.location || null,
          unit_price: parseFloat(normalizedRow.unit_price || normalizedRow.unitprice || normalizedRow.price) || 0,
        };

        // Handle specifications
        if (normalizedRow.specifications || normalizedRow.specs) {
          try {
            const specsValue = normalizedRow.specifications || normalizedRow.specs;
            item.specifications = typeof specsValue === 'string' ? JSON.parse(specsValue) : specsValue;
          } catch {
            item.specifications = {};
          }
        } else {
          item.specifications = {};
        }

        return item;
      }).filter((item: any) => item.name && item.category && item.department);

      if (items.length === 0) {
        toast.error("No valid items found in file");
        setLoading(false);
        return;
      }

      // Insert items
      const { error } = await supabase
        .from("inventory_items")
        .insert(items);

      if (error) throw error;

      toast.success(`Successfully imported ${items.length} item(s)!`);
      setImportFile(null);
      
      // Reset file input
      const fileInput = document.getElementById("import-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to import items");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add Inventory Item</h1>
            <p className="text-muted-foreground">Add a new item to the inventory</p>
          </div>
        </div>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Item</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Item Details
                </CardTitle>
                <CardDescription>Fill in the details for the new inventory item</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Item Name *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Dell Laptop"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Input
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Computer"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Latitude 5420"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="serial">Serial Number</Label>
                      <Input
                        id="serial"
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        placeholder="ABC123XYZ"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="threshold">Low Stock Threshold *</Label>
                      <Input
                        id="threshold"
                        type="number"
                        min="0"
                        value={lowStockThreshold}
                        onChange={(e) => setLowStockThreshold(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Room 101, Lab A"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Department *</Label>
                      <Select 
                        value={department} 
                        onValueChange={setDepartment} 
                        required
                        disabled={userRole === "hod"}
                      >
                        <SelectTrigger id="department">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IT">IT</SelectItem>
                          <SelectItem value="AI&DS">AI&DS</SelectItem>
                          <SelectItem value="CSE">CSE</SelectItem>
                          <SelectItem value="Physics">Physics</SelectItem>
                          <SelectItem value="Chemistry">Chemistry</SelectItem>
                          <SelectItem value="Bio-tech">Bio-tech</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specs">Specifications (JSON format)</Label>
                    <Textarea
                      id="specs"
                      value={specifications}
                      onChange={(e) => setSpecifications(e.target.value)}
                      placeholder='{"processor": "Intel i7", "ram": "16GB", "storage": "512GB SSD"}'
                      rows={4}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter specifications in JSON format (optional)
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Adding..." : "Add Item"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Bulk Import
                </CardTitle>
                <CardDescription>Upload a CSV file to import multiple items at once</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <Label htmlFor="import-file" className="cursor-pointer">
                      <span className="text-sm font-medium">Click to upload CSV or Excel file</span>
                      <Input
                        id="import-file"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      />
                    </Label>
                    {importFile && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Selected: {importFile.name}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg bg-muted p-4 space-y-2">
                    <h4 className="font-semibold text-sm">File Format Requirements:</h4>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Supported formats: CSV (.csv), Excel (.xlsx, .xls)</li>
                      <li>• Required columns: name, category, department, quantity</li>
                      <li>• Optional columns: model, serial_number, location, low_stock_threshold, specifications</li>
                      <li>• Department values: IT, AI&DS, CSE, Physics, Chemistry, Bio-tech</li>
                      <li>• Specifications should be in JSON format if provided</li>
                    </ul>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-semibold mb-1">Example CSV/Excel format:</p>
                      <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
name,category,department,quantity,model,location
Dell Laptop,Computer,IT,5,Latitude 5420,Room 101
Microscope,Lab Equipment,Bio-tech,3,BM-200,Lab A
                      </pre>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleBulkImport} className="flex gap-4">
                  <Button type="submit" disabled={loading || !importFile}>
                    {loading ? "Importing..." : "Import Items"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AddItem;
