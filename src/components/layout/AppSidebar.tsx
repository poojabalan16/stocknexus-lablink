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
  Calculator,
  ClipboardList,
  BookOpen,
  ShoppingCart,
  ArrowRightLeft,
  Search,
  Zap,
  Building2,
  GraduationCap,
  Briefcase,
  Send,
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
  { title: "ECE Department", url: "/departments/ECE", icon: Zap, dept: "ECE" },
  { title: "EEE Department", url: "/departments/EEE", icon: Zap, dept: "EEE" },
  { title: "CIVIL Department", url: "/departments/CIVIL", icon: Building2, dept: "CIVIL" },
  { title: "CSBS Department", url: "/departments/CSBS", icon: GraduationCap, dept: "CSBS" },
  { title: "MBA Department", url: "/departments/MBA", icon: Briefcase, dept: "MBA" },
  { title: "Physics Department", url: "/departments/Physics", icon: Microscope, dept: "Physics" },
  { title: "Chemistry Department", url: "/departments/Chemistry", icon: FlaskConical, dept: "Chemistry" },
  { title: "Bio-tech Department", url: "/departments/Bio-tech", icon: Dna, dept: "Bio-tech" },
  { title: "Chemical Department", url: "/departments/Chemical", icon: FlaskConical, dept: "Chemical" },
  { title: "Mechanical Department", url: "/departments/Mechanical", icon: Wrench, dept: "Mechanical" },
  { title: "Accounts", url: "/departments/Accounts", icon: Calculator, dept: "Accounts" },
  { title: "Exam Cell", url: "/departments/Exam Cell", icon: ClipboardList, dept: "Exam Cell" },
  { title: "Library", url: "/departments/Library", icon: BookOpen, dept: "Library" },
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
    <Sidebar className={collapsed ? "w-14" : "w-64"}>
      <SidebarContent>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <img src={collegeLogo} alt="College Logo" className="h-8 object-contain" />
            {!collapsed && <span className="text-lg font-bold text-primary">StockNexus</span>}
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
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/grievances" className={getNavCls}>
                      <MessageSquare className="h-4 w-4" />
                      {!collapsed && <span>Grievance Management</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/scrap" className={getNavCls}>
                      <Trash2 className="h-4 w-4" />
                      {!collapsed && <span>Scrap Management</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/purchases" className={getNavCls}>
                      <ShoppingCart className="h-4 w-4" />
                      {!collapsed && <span>Purchase & Bills</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/movements" className={getNavCls}>
                      <ArrowRightLeft className="h-4 w-4" />
                      {!collapsed && <span>Item Movements</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/requests" className={getNavCls}>
                      <ClipboardList className="h-4 w-4" />
                      {!collapsed && <span>Item Requests</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/lecture-book" className={getNavCls}>
                      <Search className="h-4 w-4" />
                      {!collapsed && <span>Ledger Book Lookup</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/stock-distribution" className={getNavCls}>
                      <Send className="h-4 w-4" />
                      {!collapsed && <span>Stock Distribution</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {userRole === "hod" && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/requests" className={getNavCls}>
                      <ClipboardList className="h-4 w-4" />
                      {!collapsed && <span>Item Requests</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/scrap" className={getNavCls}>
                      <Trash2 className="h-4 w-4" />
                      {!collapsed && <span>Scrap Management</span>}
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
