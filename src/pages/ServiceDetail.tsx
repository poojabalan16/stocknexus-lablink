import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const formSchema = z.object({
  service_type: z.enum(["internal", "external"]),
  nature_of_service: z.enum(["maintenance", "repair", "calibration", "installation"]),
  service_date: z.string().min(1),
  status: z.enum(["pending", "in_progress", "completed"]),
  technician_vendor_name: z.string().min(1).max(200),
  cost: z.string().optional(),
  remarks: z.string().optional(),
  bill_photo: z.instanceof(File).optional(),
});

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billPhotoPreview, setBillPhotoPreview] = useState<string | null>(null);

  const { data: service, isLoading, refetch } = useQuery({
    queryKey: ["service", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          inventory_items (
            name,
            category,
            model,
            serial_number
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (service) {
      form.reset({
        service_type: service.service_type,
        nature_of_service: service.nature_of_service,
        service_date: service.service_date,
        status: service.status,
        technician_vendor_name: service.technician_vendor_name,
        cost: service.cost?.toString() || "",
        remarks: service.remarks || "",
      });
      if (service.bill_photo_url) {
        setBillPhotoPreview(service.bill_photo_url);
      }
    }
  }, [service, form]);

  const handleBillPhotoChange = (file: File | null) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      form.setValue("bill_photo", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBillPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue("bill_photo", undefined);
      if (service?.bill_photo_url) {
        setBillPhotoPreview(service.bill_photo_url);
      } else {
        setBillPhotoPreview(null);
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      let billPhotoUrl = service?.bill_photo_url;

      // Upload new bill photo if provided
      if (values.bill_photo) {
        const fileExt = values.bill_photo.name.split('.').pop();
        const fileName = `${userData.user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('service-bills')
          .upload(fileName, values.bill_photo);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('service-bills')
          .getPublicUrl(fileName);
        
        billPhotoUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from("services")
        .update({
          service_type: values.service_type,
          nature_of_service: values.nature_of_service,
          service_date: values.service_date,
          status: values.status,
          technician_vendor_name: values.technician_vendor_name,
          cost: values.cost ? parseFloat(values.cost) : null,
          remarks: values.remarks,
          bill_photo_url: billPhotoUrl,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service updated successfully",
      });

      setIsEditing(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update service",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("services").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service deleted successfully",
      });

      navigate("/services");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete service",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          Loading service details...
        </div>
      </DashboardLayout>
    );
  }

  if (!service) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">Service not found</div>
      </DashboardLayout>
    );
  }

  const formatStatus = (status: string) => {
    return status === "in_progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in_progress": return "secondary";
      case "pending": return "outline";
      default: return "outline";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/services")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Service Details</h1>
              <p className="text-muted-foreground mt-1">
                View and manage service record
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditing && (
              <>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the service record.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Service</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="service_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="internal">Internal</SelectItem>
                              <SelectItem value="external">External</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nature_of_service"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nature of Service</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="repair">Repair</SelectItem>
                              <SelectItem value="calibration">Calibration</SelectItem>
                              <SelectItem value="installation">Installation</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="service_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="technician_vendor_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Technician/Vendor Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="bill-photo">Bill Photo / Receipt (Optional)</Label>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Input
                          id="bill-photo"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleBillPhotoChange(e.target.files?.[0] || null)}
                          className="flex-1"
                        />
                        {billPhotoPreview && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleBillPhotoChange(null);
                              const input = document.getElementById("bill-photo") as HTMLInputElement;
                              if (input) input.value = "";
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      {billPhotoPreview && (
                        <div className="rounded-lg border p-4">
                          <img
                            src={billPhotoPreview}
                            alt="Bill preview"
                            className="max-h-64 mx-auto rounded-lg"
                          />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Upload a photo of the service bill or receipt (Max 5MB)
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Service Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Service Type</p>
                  <Badge variant={service.service_type === "internal" ? "secondary" : "outline"}>
                    {service.service_type === "internal" ? "Internal" : "External"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nature of Service</p>
                  <p className="font-medium capitalize">{service.nature_of_service}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service Date</p>
                  <p className="font-medium">{new Date(service.service_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadgeVariant(service.status)}>
                    {formatStatus(service.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Technician/Vendor Name</p>
                  <p className="font-medium">{service.technician_vendor_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cost</p>
                  <p className="font-medium">
                    {service.cost ? `₹${service.cost.toFixed(2)}` : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Equipment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Equipment Name</p>
                  <p className="font-medium">{service.inventory_items?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{service.inventory_items?.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Model</p>
                  <p className="font-medium">{service.inventory_items?.model || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Serial Number</p>
                  <p className="font-medium">{service.inventory_items?.serial_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium capitalize">{service.department}</p>
                </div>
              </CardContent>
            </Card>

            {service.remarks && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Remarks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{service.remarks}</p>
                </CardContent>
              </Card>
            )}

            {service.bill_photo_url && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Bill / Receipt</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border p-4">
                    <img
                      src={service.bill_photo_url}
                      alt="Service bill"
                      className="max-h-96 mx-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(service.bill_photo_url!, '_blank')}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ServiceDetail;
