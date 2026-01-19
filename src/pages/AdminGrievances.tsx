import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, Image, Download } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Grievance {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  attachment_url: string | null;
  resolution_notes: string | null;
  created_by: string;
  created_at: string;
  resolved_at: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
}

const AdminGrievances = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  // Fetch all grievances
  const { data: grievances, isLoading } = useQuery({
    queryKey: ["adminGrievances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grievances")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Grievance[];
    },
  });

  // Fetch profiles for user info
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, department");
      
      if (error) throw error;
      return data as Profile[];
    },
  });

  const updateGrievance = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!selectedGrievance) throw new Error("No grievance selected");

      const updateData: Record<string, unknown> = {
        status: newStatus,
        resolution_notes: resolutionNotes || null,
      };

      if (newStatus === "resolved" || newStatus === "rejected") {
        updateData.resolved_by = user.id;
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("grievances")
        .update(updateData)
        .eq("id", selectedGrievance.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Grievance updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["adminGrievances"] });
      setSelectedGrievance(null);
      setResolutionNotes("");
      setNewStatus("");
      setAttachmentUrl(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error updating grievance", description: error.message, variant: "destructive" });
    },
  });

  const handleViewGrievance = async (grievance: Grievance) => {
    setSelectedGrievance(grievance);
    setNewStatus(grievance.status);
    setResolutionNotes(grievance.resolution_notes || "");

    // Get signed URL for attachment if exists
    if (grievance.attachment_url) {
      const { data } = await supabase.storage
        .from("grievance-attachments")
        .createSignedUrl(grievance.attachment_url, 3600);
      
      setAttachmentUrl(data?.signedUrl || null);
    } else {
      setAttachmentUrl(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "in_progress":
        return <AlertCircle className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getUserInfo = (userId: string) => {
    const profile = profiles?.find(p => p.id === userId);
    return profile ? { name: profile.full_name, department: profile.department } : { name: "Unknown", department: null };
  };

  const pendingCount = grievances?.filter(g => g.status === "pending").length || 0;
  const inProgressCount = grievances?.filter(g => g.status === "in_progress").length || 0;
  const resolvedCount = grievances?.filter(g => g.status === "resolved").length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grievance Management</h1>
          <p className="text-muted-foreground">
            Review and resolve grievances submitted by staff
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resolvedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Grievances Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Grievances</CardTitle>
            <CardDescription>Click on a grievance to view details and take action</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : grievances && grievances.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grievances.map((grievance) => {
                    const userInfo = getUserInfo(grievance.created_by);
                    return (
                      <TableRow key={grievance.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {grievance.title}
                        </TableCell>
                        <TableCell>{userInfo.name}</TableCell>
                        <TableCell>{userInfo.department || "N/A"}</TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(grievance.priority)}>
                            {grievance.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(grievance.status)}>
                            {getStatusIcon(grievance.status)}
                            <span className="ml-1 capitalize">{grievance.status.replace("_", " ")}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(grievance.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewGrievance(grievance)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No grievances</h3>
                <p className="text-muted-foreground">No grievances have been submitted yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grievance Detail Dialog */}
        <Dialog open={!!selectedGrievance} onOpenChange={(open) => !open && setSelectedGrievance(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedGrievance?.title}</DialogTitle>
              <DialogDescription>
                Submitted on {selectedGrievance && format(new Date(selectedGrievance.created_at), "MMMM dd, yyyy 'at' h:mm a")}
              </DialogDescription>
            </DialogHeader>
            
            {selectedGrievance && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge className={getPriorityColor(selectedGrievance.priority)}>
                    Priority: {selectedGrievance.priority}
                  </Badge>
                  <Badge className={getStatusColor(selectedGrievance.status)}>
                    Status: {selectedGrievance.status.replace("_", " ")}
                  </Badge>
                </div>

                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedGrievance.description}
                  </p>
                </div>

                {attachmentUrl && (
                  <div>
                    <Label className="text-sm font-medium">Attachment</Label>
                    <div className="mt-2 border rounded-md overflow-hidden">
                      <img 
                        src={attachmentUrl} 
                        alt="Grievance attachment" 
                        className="max-h-[300px] w-full object-contain bg-muted"
                      />
                      <div className="p-2 bg-muted flex justify-end">
                        <Button variant="outline" size="sm" asChild>
                          <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="status">Update Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resolution">Resolution Notes</Label>
                  <Textarea
                    id="resolution"
                    placeholder="Add notes about how this was resolved..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedGrievance(null)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => updateGrievance.mutate()}
                    disabled={updateGrievance.isPending}
                  >
                    {updateGrievance.isPending ? "Updating..." : "Update Grievance"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminGrievances;
