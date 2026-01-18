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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const mainMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Profile", url: "/profile", icon: UserCircle },
];

const departmentItems = [
  { title: "IT Department", url: "/departments/IT", icon: Cpu, dept: "IT" },
  { title: "AI&DS Department", url: "/departments/AI&DS", icon: Network, dept: "AI&DS" },
  { title: "CSE Department", url: "/departments/CSE", icon: Database, dept: "CSE" },
  { title: "Physics Department", url: "/departments/Physics", icon: Microscope, dept: "Physics" },
  { title: "Chemistry Department", url: "/departments/Chemistry", icon: FlaskConical, dept: "Chemistry" },
  { title: "Bio-tech Department", url: "/departments/Bio-tech", icon: Dna, dept: "Bio-tech" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        if (roles) {
          setUserRole(roles.role);
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
    <Sidebar className={collapsed ? "w-14" : "w-64"}>
      <SidebarContent>
        <div className="p-6">
          <div className="flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            {!collapsed && <span className="text-xl font-bold text-primary">StockNexus</span>}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {userRole === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" className={getNavCls}>
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Admin Dashboard</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/users" className={getNavCls}>
                      <Users className="h-4 w-4" />
                      {!collapsed && <span>User Management</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/services" className={getNavCls}>
                      <Wrench className="h-4 w-4" />
                      {!collapsed && <span>Service Registration</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Departments</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {departmentItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
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
