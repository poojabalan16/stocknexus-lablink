import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
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

const formSchema = z.object({
  service_type: z.enum(["internal", "external"], {
    required_error: "Please select a service type",
  }),
  department: z.string().min(1, "Please select a department"),
  equipment_id: z.string().min(1, "Please select an equipment"),
  nature_of_service: z.enum(["maintenance", "repair", "calibration", "installation"], {
    required_error: "Please select nature of service",
  }),
  service_date: z.string().min(1, "Service date is required"),
  status: z.enum(["pending", "in_progress", "completed"]),
  technician_vendor_name: z.string().min(1, "Technician/Vendor name is required").max(200),
  cost: z.string().optional(),
  remarks: z.string().optional(),
  bill_photo: z.instanceof(File).optional(),
});

const AddService = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billPhotoPreview, setBillPhotoPreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "pending",
    },
  });

  // Fetch equipment for dropdown
  const { data: equipment } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, category, department")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Filter equipment by selected department
  const selectedDepartment = form.watch("department");
  const filteredEquipment = equipment?.filter(
    (item) => item.department === selectedDepartment
  );

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
      setBillPhotoPreview(null);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      let billPhotoUrl = null;

      // Upload bill photo if provided
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

      const serviceData = {
        service_type: values.service_type,
        department: values.department as Database["public"]["Enums"]["department"],
        equipment_id: values.equipment_id,
        nature_of_service: values.nature_of_service,
        service_date: values.service_date,
        status: values.status,
        technician_vendor_name: values.technician_vendor_name,
        cost: values.cost ? parseFloat(values.cost) : null,
        remarks: values.remarks,
        bill_photo_url: billPhotoUrl,
        created_by: userData.user.id,
      };

      const { error } = await supabase.from("services").insert([serviceData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service registered successfully",
      });

      navigate("/services");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to register service",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/services")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Register New Service</h1>
            <p className="text-muted-foreground mt-1">
              Add a new equipment service record
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select service type" />
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
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="IT">IT</SelectItem>
                            <SelectItem value="AI&DS">AI&DS</SelectItem>
                            <SelectItem value="CSE">CSE</SelectItem>
                            <SelectItem value="Physics">Physics</SelectItem>
                            <SelectItem value="Chemistry">Chemistry</SelectItem>
                            <SelectItem value="Bio-tech">Bio-tech</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="equipment_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={!selectedDepartment}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select equipment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredEquipment?.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name} - {item.category}
                              </SelectItem>
                            ))}
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select nature of service" />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
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
                          <Input placeholder="Enter name" {...field} />
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
                        <FormLabel>Cost (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Enter cost"
                            {...field}
                          />
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
                      <FormLabel>Remarks (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional remarks"
                          {...field}
                        />
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
                    {isSubmitting ? "Registering..." : "Register Service"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/services")}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AddService;
