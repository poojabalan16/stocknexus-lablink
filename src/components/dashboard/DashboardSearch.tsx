import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("inventory_items")
      .select("id, name, department, quantity, item_status, lecture_book_number")
      .or(`name.ilike.%${value}%,department.ilike.%${value}%,lecture_book_number.ilike.%${value}%`)
      .limit(20);
    setResults(data || []);
    setSearching(false);
  };

  return (
    <Card className="animate-fade-in">
      <CardContent className="pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by item name, department, or ledger book number..."
            value={query}
            onChange={e => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {results.length > 0 && (
          <div className="mt-3 max-h-64 overflow-auto rounded-md border divide-y">
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
        {query.length >= 2 && results.length === 0 && !searching && (
          <p className="text-sm text-muted-foreground mt-2 text-center">No results found</p>
        )}
      </CardContent>
    </Card>
  );
}
