import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Home,
  Package,
  FileText,
  Bell,
  Users,
  UserCircle,
  Database,
  Cpu,
  Microscope,
  FlaskConical,
  Dna,
  Network,
  Shield,
  Wrench,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const mainMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Grievance Box", url: "/grievances", icon: MessageSquare },
  { title: "Profile", url: "/profile", icon: UserCircle },
];

const departmentItems = [
  { title: "IT Department", url: "/departments/IT", icon: Cpu, dept: "IT" },
  { title: "AI&DS Department", url: "/departments/AI&DS", icon: Network, dept: "AI&DS" },
  { title: "CSE Department", url: "/departments/CSE", icon: Database, dept: "CSE" },
  { title: "Physics Department", url: "/departments/Physics", icon: Microscope, dept: "Physics" },
  { title: "Chemistry Department", url: "/departments/Chemistry", icon: FlaskConical, dept: "Chemistry" },
  { title: "Bio-tech Department", url: "/departments/Bio-tech", icon: Dna, dept: "Bio-tech" },
  { title: "Chemical Department", url: "/departments/Chemical", icon: FlaskConical, dept: "Chemical" },
  { title: "Mechanical Department", url: "/departments/Mechanical", icon: Wrench, dept: "Mechanical" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role, department")
          .eq("user_id", user.id)
          .single();
        
        if (roles) {
          setUserRole(roles.role);
          setUserDepartment(roles.department);
        }
      }
    };

    fetchUserRole();
  }, []);

  const isActive = (path: string) => location.pathname === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "hover:bg-sidebar-accent/50";

  return (
    <Sidebar className={`${collapsed ? "w-14" : "w-64"} border-r border-sidebar-border/50`}>
      <SidebarContent className="scrollbar-thin">
        {/* Logo Section */}
        <div className="p-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-primary shadow-md">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-bold gradient-text">StockNexus</span>
                <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">Inventory System</span>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="pt-4">
          <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-4">Main Menu</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="rounded-lg transition-smooth">
                    <NavLink to={item.url} end className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth ${
                        isActive 
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                          : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                      }`
                    }>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {userRole === "admin" && (
          <SidebarGroup className="pt-2">
            <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-4">Administration</SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="rounded-lg transition-smooth">
                    <NavLink to="/admin" className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth ${
                        isActive 
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                          : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                      }`
                    }>
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span className="text-sm">Admin Dashboard</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="rounded-lg transition-smooth">
                    <NavLink to="/users" className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth ${
                        isActive 
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                          : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                      }`
                    }>
                      <Users className="h-4 w-4" />
                      {!collapsed && <span className="text-sm">User Management</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="rounded-lg transition-smooth">
                    <NavLink to="/services" className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth ${
                        isActive 
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                          : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                      }`
                    }>
                      <Wrench className="h-4 w-4" />
                      {!collapsed && <span className="text-sm">Service Registration</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="rounded-lg transition-smooth">
                    <NavLink to="/admin/grievances" className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth ${
                        isActive 
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                          : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                      }`
                    }>
                      <MessageSquare className="h-4 w-4" />
                      {!collapsed && <span className="text-sm">Grievance Management</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="rounded-lg transition-smooth">
                    <NavLink to="/scrap" className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth ${
                        isActive 
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                          : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                      }`
                    }>
                      <Trash2 className="h-4 w-4" />
                      {!collapsed && <span className="text-sm">Scrap Management</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {userRole === "hod" && (
          <SidebarGroup className="pt-2">
            <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-4">Management</SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="rounded-lg transition-smooth">
                    <NavLink to="/scrap" className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth ${
                        isActive 
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                          : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                      }`
                    }>
                      <Trash2 className="h-4 w-4" />
                      {!collapsed && <span className="text-sm">Scrap Management</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="pt-2">
          <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-4">Departments</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              {departmentItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="rounded-lg transition-smooth">
                    <NavLink to={item.url} className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth ${
                        isActive 
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                          : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                      }`
                    }>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
