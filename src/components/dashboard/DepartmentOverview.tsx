import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Cpu, Network, Database, Microscope, FlaskConical, Dna } from "lucide-react";

const departmentIcons: Record<string, any> = {
  IT: Cpu,
  AIDS: Network,
  CSE: Database,
  Physics: Microscope,
  Chemistry: FlaskConical,
  "Bio-tech": Dna,
};

interface DepartmentData {
  department: string;
  totalItems: number;
  lowStockCount: number;
}

export function DepartmentOverview() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<DepartmentData[]>([]);

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select("department, quantity, low_stock_threshold");

      if (data) {
        const deptMap = new Map<string, DepartmentData>();
        
        data.forEach((item) => {
          const dept = item.department;
          if (!deptMap.has(dept)) {
            deptMap.set(dept, { department: dept, totalItems: 0, lowStockCount: 0 });
          }
          
          const deptData = deptMap.get(dept)!;
          deptData.totalItems += item.quantity;
          if (item.quantity <= item.low_stock_threshold) {
            deptData.lowStockCount++;
          }
        });

        setDepartments(Array.from(deptMap.values()));
      }
    };

    fetchDepartments();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Department Overview</h2>
        <p className="text-muted-foreground">Quick view of inventory across all departments</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => {
          const Icon = departmentIcons[dept.department] || Database;
          return (
            <Card key={dept.department} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{dept.department}</CardTitle>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardDescription>Department Inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span className="font-semibold">{dept.totalItems}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Low Stock:</span>
                    <span className={`font-semibold ${dept.lowStockCount > 0 ? 'text-warning' : 'text-accent'}`}>
                      {dept.lowStockCount}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => navigate(`/departments/${dept.department}`)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
