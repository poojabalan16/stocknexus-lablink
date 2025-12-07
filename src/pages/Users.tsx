import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Clock, User, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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

const Users = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "delete" | null>(null);

  useEffect(() => {
    checkAuth();
    fetchRequests();
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

  const handleApprove = async (request: RegistrationRequest) => {
    try {
      // Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: request.email,
        password: Math.random().toString(36).slice(-12), // Generate random password
        options: {
          data: {
            full_name: request.full_name,
          },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          email: request.email,
          full_name: request.full_name,
          department: request.department as any,
        } as any);

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          role: request.requested_role as any,
          department: request.department as any,
        } as any);

      if (roleError) throw roleError;

      // Update request status
      const { error: updateError } = await supabase
        .from("registration_requests")
        .update({ 
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      toast.success("User approved successfully! They will receive a password reset email.");
      fetchRequests();
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border border-primary/20">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <User className="h-10 w-10 text-primary" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Review and manage user registration requests
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-0" />
        </div>

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
      </div>

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
    </DashboardLayout>
  );
};

export default Users;
