import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="text-center space-y-6 p-8">
        <Package className="h-20 w-20 text-primary mx-auto" />
        <h1 className="text-5xl font-bold text-primary">StockNexus</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Professional Laboratory Inventory Management System
        </p>
        <Button onClick={() => navigate("/auth")} size="lg" className="mt-4">
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
