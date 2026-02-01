import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const formSchema = z.object({
  service_type: z.enum(["internal", "external"], {
    required_error: "Please select a service type",
  }),
  department: z.string().min(1, "Please select a department"),
  equipment_category: z.string().min(1, "Please select an equipment category"),
  service_scope: z.enum(["single", "bulk"], {
    required_error: "Please select service scope",
  }),
  equipment_id: z.string().optional(),
  nature_of_service: z.enum(["maintenance", "repair", "calibration", "installation"], {
    required_error: "Please select nature of service",
  }),
  service_date: z.string().min(1, "Service date is required"),
  status: z.enum(["pending", "in_progress", "completed"]),
  technician_vendor_name: z.string().min(1, "Technician/Vendor name is required").max(200),
  cost: z.string().optional(),
  remarks: z.string().optional(),
  bill_photo: z.instanceof(File).optional(),
}).refine((data) => {
  // If single service, equipment_id is required
  if (data.service_scope === "single" && !data.equipment_id) {
    return false;
  }
  return true;
}, {
  message: "Please select a specific item for single service",
  path: ["equipment_id"],
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
      service_scope: "single",
    },
  });

  // Fetch equipment for dropdown
  const { data: equipment } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, category, department, model, serial_number")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Watch form values
  const selectedDepartment = form.watch("department");
  const selectedCategory = form.watch("equipment_category");
  const serviceScope = form.watch("service_scope");

  // Get unique categories for the selected department
  const departmentEquipment = equipment?.filter(
    (item) => item.department === selectedDepartment
  );

  const uniqueCategories = [...new Set(departmentEquipment?.map((item) => item.category).filter(Boolean))] as string[];

  // Get items for selected category in department
  const categoryItems = departmentEquipment?.filter(
    (item) => item.category === selectedCategory
  );

  // Reset dependent fields when department changes
  useEffect(() => {
    form.setValue("equipment_category", "");
    form.setValue("equipment_id", "");
    form.setValue("nature_of_service", undefined as any);
  }, [selectedDepartment, form]);

  // Reset equipment_id when category changes
  useEffect(() => {
    form.setValue("equipment_id", "");
    form.setValue("nature_of_service", undefined as any);
  }, [selectedCategory, form]);

  // Get nature of service options based on equipment category
  const getNatureOfServiceOptions = () => {
    const category = selectedCategory?.toLowerCase() || "";
    
    if (category.includes("computer") || category.includes("electronic") || category.includes("monitor") || category.includes("printer") || category.includes("laptop")) {
      return [
        { value: "maintenance", label: "Maintenance" },
        { value: "repair", label: "Repair" },
        { value: "installation", label: "Installation" },
      ];
    } else if (category.includes("lab") || category.includes("equipment") || category.includes("instrument") || category.includes("microscope") || category.includes("spectrometer")) {
      return [
        { value: "calibration", label: "Calibration" },
        { value: "maintenance", label: "Maintenance" },
        { value: "repair", label: "Repair" },
      ];
    }
    // Default: all options
    return [
      { value: "maintenance", label: "Maintenance" },
      { value: "repair", label: "Repair" },
      { value: "calibration", label: "Calibration" },
      { value: "installation", label: "Installation" },
    ];
  };

  const natureOfServiceOptions = getNatureOfServiceOptions();

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

      // For bulk service, we need to get a representative equipment_id from the category
      let equipmentId = values.equipment_id;
      if (values.service_scope === "bulk" && categoryItems && categoryItems.length > 0) {
        equipmentId = categoryItems[0].id;
      }

      if (!equipmentId) {
        throw new Error("No equipment found for the selected category");
      }

      const serviceData = {
        service_type: values.service_type,
        department: values.department as Database["public"]["Enums"]["department"],
        equipment_id: equipmentId,
        nature_of_service: values.nature_of_service,
        service_date: values.service_date,
        status: values.status,
        technician_vendor_name: values.technician_vendor_name,
        cost: values.cost ? parseFloat(values.cost) : null,
        remarks: values.service_scope === "bulk" 
          ? `[BULK SERVICE - ${selectedCategory}] ${values.remarks || ""}`.trim()
          : values.remarks,
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
                            <SelectItem value="Chemical">Chemical</SelectItem>
                            <SelectItem value="Mechanical">Mechanical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="equipment_category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedDepartment}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={selectedDepartment ? "Select category" : "Select department first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {uniqueCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
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
                    name="service_scope"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Service Scope</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex gap-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="single" id="single" />
                              <Label htmlFor="single" className="font-normal cursor-pointer">
                                Single Item
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="bulk" id="bulk" />
                              <Label htmlFor="bulk" className="font-normal cursor-pointer">
                                Bulk Service
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {serviceScope === "single" && (
                    <FormField
                      control={form.control}
                      name="equipment_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Item</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!selectedCategory}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={selectedCategory ? "Select specific item" : "Select category first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categoryItems?.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} {item.model ? `- ${item.model}` : ""} {item.serial_number ? `(${item.serial_number})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {serviceScope === "bulk" && selectedCategory && (
                    <div className="flex items-center">
                      <p className="text-sm text-muted-foreground">
                        Bulk service will be registered for all <strong>{categoryItems?.length || 0}</strong> items in "{selectedCategory}" category
                      </p>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="nature_of_service"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nature of Service</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!selectedCategory}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={selectedCategory ? "Select nature of service" : "Select category first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {natureOfServiceOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
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
