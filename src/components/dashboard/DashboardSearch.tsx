import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Constants } from "@/integrations/supabase/types";

const ALL_DEPARTMENTS = Constants.public.Enums.department;
const ITEM_STATUSES = Constants.public.Enums.item_status;

interface SearchResult {
  id: string;
  name: string;
  department: string;
  quantity: number;
  item_status: string;
  lecture_book_number: string | null;
}

export function DashboardSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (value: string, dept?: string, status?: string) => {
    setQuery(value);
    const currentDept = dept ?? departmentFilter;
    const currentStatus = status ?? statusFilter;

    if (value.length < 2 && currentDept === "all" && currentStatus === "all") {
      setResults([]);
      return;
    }

    setSearching(true);

    let dbQuery = supabase
      .from("inventory_items")
      .select("id, name, department, quantity, item_status, lecture_book_number");

    if (value.length >= 2) {
      dbQuery = dbQuery.or(
        `name.ilike.%${value}%,department.ilike.%${value}%,lecture_book_number.ilike.%${value}%`
      );
    }

    if (currentDept !== "all") {
      dbQuery = dbQuery.eq("department", currentDept as any);
    }

    if (currentStatus !== "all") {
      dbQuery = dbQuery.eq("item_status", currentStatus);
    }

    const { data } = await dbQuery.limit(30);
    setResults(data || []);
    setSearching(false);
  };

  const handleDeptChange = (val: string) => {
    setDepartmentFilter(val);
    handleSearch(query, val, statusFilter);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    handleSearch(query, departmentFilter, val);
  };

  return (
    <Card className="animate-fade-in">
      <CardContent className="pt-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item name, department, or ledger book number..."
              value={query}
              onChange={e => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={departmentFilter} onValueChange={handleDeptChange}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {ALL_DEPARTMENTS.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {ITEM_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {results.length > 0 && (
          <div className="max-h-64 overflow-auto rounded-md border divide-y">
            {results.map(r => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/inventory/${r.id}`)}
              >
                <div>
                  <p className="font-medium text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.department} {r.lecture_book_number ? `• LBN: ${r.lecture_book_number}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{r.quantity}</span>
                  <Badge variant="outline" className="text-xs">{r.item_status.replace("_", " ")}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
        {(query.length >= 2 || departmentFilter !== "all" || statusFilter !== "all") && results.length === 0 && !searching && (
          <p className="text-sm text-muted-foreground mt-2 text-center">No results found</p>
        )}
      </CardContent>
    </Card>
  );
}
