import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, ChevronRight, Shield, BarChart3, Users, Sparkles, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute inset-0 gradient-hero opacity-50" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-[10%] w-80 h-80 bg-primary/20 rounded-full blur-[100px] animate-pulse-slow" />
      <div className="absolute bottom-20 right-[10%] w-96 h-96 bg-accent/15 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
      
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6 md:p-8">
        <div className="max-w-6xl w-full">
          {/* Hero Section */}
          <div className="text-center space-y-8 animate-in">
            {/* Logo */}
            <div className="inline-flex items-center justify-center p-5 rounded-2xl glass shadow-lg hover-glow group cursor-default">
              <Package className="h-14 w-14 text-primary group-hover:scale-110 transition-bounce" />
            </div>
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Enterprise Inventory Management
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight">
              <span className="gradient-text">StockNexus</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
              Professional Laboratory Inventory Management System
            </p>
            
            <p className="text-base md:text-lg text-muted-foreground/70 max-w-xl mx-auto leading-relaxed">
              Streamline your lab operations with real-time tracking, automated alerts, and comprehensive reporting
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
              <Button 
                onClick={() => navigate("/auth")} 
                size="lg" 
                className="group text-base px-8 h-14"
              >
                Get Started
                <ChevronRight className="ml-1 h-5 w-5 group-hover:translate-x-1 transition-smooth" />
              </Button>
              <Button 
                onClick={() => navigate("/auth")} 
                size="lg" 
                variant="outline"
                className="text-base px-8 h-14 group"
              >
                Sign In
                <ArrowRight className="ml-1 h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-smooth" />
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-24">
            {[
              {
                icon: Shield,
                title: "Secure & Reliable",
                description: "Enterprise-grade security with role-based access control",
                gradient: "gradient-primary",
                delay: "0s"
              },
              {
                icon: BarChart3,
                title: "Real-time Analytics",
                description: "Track inventory levels and generate insights instantly",
                gradient: "gradient-accent",
                delay: "0.1s"
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Seamless multi-user support with department management",
                gradient: "gradient-primary",
                delay: "0.2s"
              }
            ].map((feature, index) => (
              <div 
                key={feature.title}
                className="group glass rounded-2xl p-8 hover-lift hover-glow cursor-default animate-in"
                style={{ animationDelay: feature.delay }}
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${feature.gradient} shadow-lg mb-6 group-hover:scale-110 transition-bounce`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-20 pt-8 border-t border-border/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Real-time Sync
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Bank-grade Security
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Advanced Analytics
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
