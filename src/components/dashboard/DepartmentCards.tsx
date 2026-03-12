import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Cpu, Network, Database, Microscope, FlaskConical, Dna, Beaker, Cog, Calculator, ClipboardList, BookOpen, Zap, Building2, GraduationCap, Briefcase } from "lucide-react";

const deptIcons: Record<string, any> = {
  IT: Cpu, "AI&DS": Network, CSE: Database, ECE: Zap, EEE: Zap, CIVIL: Building2,
  CSBS: GraduationCap, MBA: Briefcase, Physics: Microscope, Chemistry: FlaskConical,
  "Bio-tech": Dna, Chemical: Beaker, Mechanical: Cog, Accounts: Calculator,
  "Exam Cell": ClipboardList, Library: BookOpen,
};

interface DeptCount { department: string; total: number; }

export function DepartmentCards() {
  const navigate = useNavigate();
  const [depts, setDepts] = useState<DeptCount[]>([]);

  const fetchData = async () => {
    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data } = await supabase
        .from("inventory_items")
        .select("department, quantity")
        .neq("department", "Main Stock")
        .range(from, from + batchSize - 1);
      if (!data || data.length === 0) break;
      allData = [...allData, ...data];
      if (data.length < batchSize) break;
      from += batchSize;
    }
    const map = new Map<string, number>();
    allData.forEach(item => map.set(item.department, (map.get(item.department) || 0) + item.quantity));
    setDepts(Array.from(map.entries()).map(([department, total]) => ({ department, total })).sort((a, b) => a.department.localeCompare(b.department)));
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("dept-cards-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Department Stock Overview</h2>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {depts.map(d => {
          const Icon = deptIcons[d.department] || Database;
          return (
            <Card
              key={d.department}
              className="cursor-pointer hover-lift transition-all hover:border-primary/50"
              onClick={() => navigate(`/departments/${d.department}`)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{d.department}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{d.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total Items</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
