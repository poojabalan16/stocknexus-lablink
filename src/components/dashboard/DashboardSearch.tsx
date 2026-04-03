import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Constants } from "@/integrations/supabase/types";

const ALL_DEPARTMENTS = Constants.public.Enums.department;

interface SearchResult {
  id: string;
  name: string;
  department: string;
  quantity: number;
  item_status: string;
  lecture_book_number: string | null;
  cabin_number: string | null;
}

export function DashboardSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async (value: string, dept: string, status: string) => {
    if (value.length < 1 && dept === "all" && status === "all") {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setHasSearched(true);

    // Paginated fetch to avoid 1000 limit
    let allData: SearchResult[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      let dbQuery = supabase
        .from("inventory_items")
        .select("id, name, department, quantity, item_status, lecture_book_number, cabin_number");

      if (value.length >= 1) {
        const isNumeric = /^\d+$/.test(value.trim());
        if (isNumeric) {
          dbQuery = dbQuery.or(
            `quantity.eq.${value.trim()},name.ilike.%${value}%,lecture_book_number.ilike.%${value}%,cabin_number.ilike.%${value}%`
          );
        } else {
          dbQuery = dbQuery.or(
            `name.ilike.%${value}%,department.ilike.%${value}%,lecture_book_number.ilike.%${value}%,cabin_number.ilike.%${value}%`
          );
        }
      }

      if (dept !== "all") {
        dbQuery = dbQuery.eq("department", dept as any);
      }

      if (status !== "all") {
        dbQuery = dbQuery.eq("item_status", status);
      }

      const { data } = await dbQuery.range(from, from + batchSize - 1);
      if (!data || data.length === 0) break;
      allData = [...allData, ...data];
      if (data.length < batchSize) break;
      from += batchSize;
    }

    setResults(allData);
    setSearching(false);
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    performSearch(value, departmentFilter, statusFilter);
  };

  const handleDeptChange = (val: string) => {
    setDepartmentFilter(val);
    performSearch(query, val, statusFilter);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    performSearch(query, departmentFilter, val);
  };

  const highlightMatch = (text: string, search: string) => {
    if (!search || search.length < 1) return text;
    const idx = text.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/20 text-foreground rounded px-0.5">{text.slice(idx, idx + search.length)}</mark>
        {text.slice(idx + search.length)}
      </>
    );
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5" />
          Search & Filter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item name, ledger book, cabin number, or quantity..."
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
        </div>

        {results.length > 0 && (
          <div className="rounded-md border overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Ledger Book</TableHead>
                  <TableHead>Cabin Number</TableHead>
                  <TableHead>Total Stock</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map(r => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/inventory/${r.id}`)}
                  >
                    <TableCell className="font-medium">{highlightMatch(r.name, query)}</TableCell>
                    <TableCell>{r.lecture_book_number ? highlightMatch(r.lecture_book_number, query) : "-"}</TableCell>
                    <TableCell>{r.cabin_number ? highlightMatch(r.cabin_number, query) : "-"}</TableCell>
                    <TableCell className="font-semibold">
                      {/^\d+$/.test(query.trim()) && r.quantity === parseInt(query.trim())
                        ? <mark className="bg-primary/20 rounded px-1">{r.quantity}</mark>
                        : r.quantity}
                    </TableCell>
                    <TableCell>{highlightMatch(r.department, query)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{r.item_status.replace("_", " ")}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-2 text-xs text-muted-foreground text-center border-t">
              {results.length} result{results.length !== 1 ? "s" : ""} found
            </div>
          </div>
        )}

        {hasSearched && results.length === 0 && !searching && (
          <p className="text-sm text-muted-foreground text-center py-4">No results found</p>
        )}
        {searching && (
          <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
        )}
      </CardContent>
    </Card>
  );
}
