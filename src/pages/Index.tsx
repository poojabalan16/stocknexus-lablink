import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, ChevronRight, Shield, BarChart3, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated background gradient */}
      <div className="absolute inset-0 gradient-hero animate-pulse-slow" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
      
      <div className="relative z-10 flex min-h-screen items-center justify-center p-8">
        <div className="max-w-5xl w-full">
          {/* Hero Section */}
          <div className="text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-card/80 backdrop-blur-sm shadow-lg hover-glow mb-6">
              <Package className="h-16 w-16 text-primary" />
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              StockNexus
            </h1>
            
            <p className="text-2xl text-muted-foreground max-w-2xl mx-auto text-balance">
              Professional Laboratory Inventory Management System
            </p>
            
            <p className="text-lg text-muted-foreground/80 max-w-xl mx-auto">
              Streamline your lab operations with real-time tracking, automated alerts, and comprehensive reporting
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button 
                onClick={() => navigate("/auth")} 
                size="lg" 
                className="group gradient-primary hover:shadow-glow transition-smooth text-lg px-8"
              >
                Get Started
                <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                onClick={() => navigate("/auth")} 
                size="lg" 
                variant="outline"
                className="text-lg px-8 hover-lift"
              >
                Sign In
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-20 animate-slide-up">
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 shadow-md hover-lift hover-glow">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg gradient-primary mb-4">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-muted-foreground">
                Enterprise-grade security with role-based access control
              </p>
            </div>

            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 shadow-md hover-lift hover-glow" style={{ animationDelay: "0.1s" }}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg gradient-accent mb-4">
                <BarChart3 className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Analytics</h3>
              <p className="text-muted-foreground">
                Track inventory levels and generate insights instantly
              </p>
            </div>

            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 shadow-md hover-lift hover-glow" style={{ animationDelay: "0.2s" }}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-warning mb-4">
                <Users className="h-6 w-6 text-warning-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
              <p className="text-muted-foreground">
                Seamless multi-user support with department management
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
