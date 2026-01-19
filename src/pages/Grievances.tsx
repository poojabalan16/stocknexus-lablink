import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Upload, Clock, CheckCircle, XCircle, AlertCircle, Plus } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Grievance {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  attachment_url: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

const Grievances = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check user role
  const { data: userRole } = useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      return data?.role;
    },
  });

  // Fetch grievances
  const { data: grievances, isLoading } = useQuery({
    queryKey: ["grievances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grievances")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Grievance[];
    },
  });

  const submitGrievance = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let attachmentUrl = null;

      // Upload attachment if provided
      if (attachment) {
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("grievance-attachments")
          .upload(fileName, attachment);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("grievance-attachments")
          .getPublicUrl(fileName);
        
        attachmentUrl = fileName; // Store path for signed URL access
      }

      const { error } = await supabase.from("grievances").insert({
        title,
        description,
        priority,
        attachment_url: attachmentUrl,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Grievance submitted successfully" });
      queryClient.invalidateQueries({ queryKey: ["grievances"] });
      setIsDialogOpen(false);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setAttachment(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error submitting grievance", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    await submitGrievance.mutateAsync();
    setIsSubmitting(false);
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

  const canSubmitGrievance = userRole === "hod" || userRole === "staff";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Grievance Box</h1>
            <p className="text-muted-foreground">
              Submit and track your complaints and issues
            </p>
          </div>
          {canSubmitGrievance && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Submit Grievance
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Submit a Grievance</DialogTitle>
                  <DialogDescription>
                    Describe your issue and attach any relevant screenshots
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="Brief title of your issue"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your issue in detail..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attachment">Attachment (Screenshot)</Label>
                    <Input
                      id="attachment"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                    />
                    {attachment && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {attachment.name}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Grievance"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : grievances && grievances.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grievances.map((grievance) => (
              <Card key={grievance.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-1">{grievance.title}</CardTitle>
                    <div className="flex gap-2">
                      <Badge className={getPriorityColor(grievance.priority)}>
                        {grievance.priority}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Badge className={getStatusColor(grievance.status)}>
                      {getStatusIcon(grievance.status)}
                      <span className="ml-1 capitalize">{grievance.status.replace("_", " ")}</span>
                    </Badge>
                    <span className="text-xs">
                      {format(new Date(grievance.created_at), "MMM dd, yyyy")}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {grievance.description}
                  </p>
                  {grievance.attachment_url && (
                    <div className="mt-2 flex items-center gap-1 text-sm text-primary">
                      <Upload className="h-3 w-3" />
                      <span>Attachment included</span>
                    </div>
                  )}
                  {grievance.resolution_notes && (
                    <div className="mt-3 p-2 bg-muted rounded-md">
                      <p className="text-xs font-medium">Resolution Notes:</p>
                      <p className="text-sm">{grievance.resolution_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No grievances yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {canSubmitGrievance
                  ? "You haven't submitted any grievances. Click the button above to submit one."
                  : "No grievances have been submitted yet."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Grievances;
