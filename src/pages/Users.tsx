import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Clock, User, Trash2, Users as UsersIcon, Shield, Edit2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface RegistrationRequest {
  id: string;
  email: string;
  full_name: string;
  department: string;
  requested_role: string;
  justification: string;
  status: string;
  created_at: string;
}

interface ApprovedUser {
  id: string;
  email: string;
  full_name: string;
  department: string | null;
  approved: boolean;
  created_at: string;
  role?: string;
  role_department?: string;
}

const Users = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "delete" | null>(null);
  const [editingUser, setEditingUser] = useState<ApprovedUser | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [newDepartment, setNewDepartment] = useState<string>("");

  useEffect(() => {
    checkAuth();
    fetchRequests();
    fetchApprovedUsers();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roles || roles.role !== "admin") {
      toast.error("Access denied. Admin only.");
      navigate("/dashboard");
    }
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("registration_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast.error("Failed to load registration requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedUsers = async () => {
    try {
      // Fetch approved profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || 'staff',
          role_department: userRole?.department || profile.department,
        };
      });

      setApprovedUsers(usersWithRoles);
    } catch (error: any) {
      toast.error("Failed to load approved users");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleApprove = async (request: RegistrationRequest) => {
    try {
      const { data, error } = await supabase.functions.invoke('approve-user', {
        body: {
          requestId: request.id,
          email: request.email,
          fullName: request.full_name,
          department: request.department,
          requestedRole: request.requested_role,
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("User approved successfully! They will receive a confirmation email.");
      fetchRequests();
      fetchApprovedUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve user");
    } finally {
      setSelectedRequest(null);
      setActionType(null);
    }
  };

  const handleReject = async (request: RegistrationRequest) => {
    try {
      const { error } = await supabase
        .from("registration_requests")
        .update({ 
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", request.id);

      if (error) throw error;

      toast.success("Request rejected");
      fetchRequests();
    } catch (error: any) {
      toast.error("Failed to reject request");
    } finally {
      setSelectedRequest(null);
      setActionType(null);
    }
  };

  const handleDelete = async (request: RegistrationRequest) => {
    try {
      const { error } = await supabase
        .from("registration_requests")
        .delete()
        .eq("id", request.id);

      if (error) throw error;

      toast.success("Request deleted successfully");
      fetchRequests();
    } catch (error: any) {
      toast.error("Failed to delete request");
    } finally {
      setSelectedRequest(null);
      setActionType(null);
    }
  };

  const handleEditUser = (user: ApprovedUser) => {
    setEditingUser(user);
    setNewRole(user.role || 'staff');
    setNewDepartment(user.role_department || user.department || 'IT');
  };

  const handleUpdateRole = async () => {
    if (!editingUser) return;

    try {
      // Update user_roles table
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({
          role: newRole as "admin" | "hod" | "staff",
          department: newDepartment as "IT" | "AI&DS" | "CSE" | "Physics" | "Chemistry" | "Bio-tech",
        })
        .eq("user_id", editingUser.id);

      if (roleError) throw roleError;

      // Update profile department
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          department: newDepartment as "IT" | "AI&DS" | "CSE" | "Physics" | "Chemistry" | "Bio-tech",
        })
        .eq("id", editingUser.id);

      if (profileError) throw profileError;

      toast.success("User role updated successfully");
      setEditingUser(null);
      fetchApprovedUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update user role");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="gap-1 bg-success"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-primary gap-1"><Shield className="h-3 w-3" /> Admin</Badge>;
      case "hod":
        return <Badge className="bg-blue-600 gap-1"><UsersIcon className="h-3 w-3" /> HOD</Badge>;
      case "staff":
        return <Badge variant="secondary" className="gap-1"><User className="h-3 w-3" /> Staff</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border border-primary/20">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <UsersIcon className="h-10 w-10 text-primary" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Review registration requests and manage user roles
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-0" />
        </div>

        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="requests" className="gap-2">
              <Clock className="h-4 w-4" />
              Requests
              {pendingRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <UsersIcon className="h-4 w-4" />
              Approved Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Registration Requests
                </CardTitle>
                <CardDescription>Approve or reject user access requests</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading...</p>
                ) : requests.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No registration requests</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">{request.full_name}</TableCell>
                            <TableCell>{request.email}</TableCell>
                            <TableCell>{request.department}</TableCell>
                            <TableCell className="capitalize">{request.requested_role}</TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {request.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => {
                                        setSelectedRequest(request);
                                        setActionType("approve");
                                      }}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setSelectedRequest(request);
                                        setActionType("reject");
                                      }}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {request.status === "rejected" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setActionType("delete");
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5" />
                  Approved Users
                </CardTitle>
                <CardDescription>Manage user roles and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading...</p>
                ) : approvedUsers.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No approved users</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.full_name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.role_department || user.department || '-'}</TableCell>
                            <TableCell>{getRoleBadge(user.role || 'staff')}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit Role
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve/Reject/Delete Dialog */}
      <AlertDialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve" ? "Approve Request" : actionType === "reject" ? "Reject Request" : "Delete Request"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "approve"
                ? `Are you sure you want to approve ${selectedRequest?.full_name}'s request? A user account will be created and they will receive an email to set their password.`
                : actionType === "reject"
                ? `Are you sure you want to reject ${selectedRequest?.full_name}'s request?`
                : `Are you sure you want to permanently delete ${selectedRequest?.full_name}'s rejected request? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedRequest && actionType === "approve") {
                  handleApprove(selectedRequest);
                } else if (selectedRequest && actionType === "reject") {
                  handleReject(selectedRequest);
                } else if (selectedRequest && actionType === "delete") {
                  handleDelete(selectedRequest);
                }
              }}
              className={actionType === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {actionType === "approve" ? "Approve" : actionType === "reject" ? "Reject" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Update role and department for {editingUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hod">HOD</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={newDepartment} onValueChange={setNewDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="AI&DS">AI&DS</SelectItem>
                  <SelectItem value="CSE">CSE</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Bio-tech">Bio-tech</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Users;
