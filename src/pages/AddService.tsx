import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Upload, 
  Building2, 
  Wrench, 
  Package, 
  Calendar, 
  User, 
  IndianRupee,
  FileText,
  X,
  CheckCircle2,
  Save,
  Loader2
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const departments = ["IT", "AI&DS", "CSE", "Physics", "Chemistry", "Bio-tech", "Chemical", "Mechanical"] as const;

const formSchema = z.object({
  service_type: z.enum(["internal", "external"], {
    required_error: "Please select a service type",
  }),
  department: z.string().min(1, "Please select a department"),
  equipment_id: z.string().min(1, "Please select an equipment item"),
  nature_of_service: z.enum(["maintenance", "repair", "calibration", "installation"], {
    required_error: "Please select nature of service",
  }),
  service_date: z.string().min(1, "Service date is required"),
  status: z.enum(["pending", "in_progress", "completed"]),
  technician_vendor_name: z.string().min(1, "Vendor/Technician name is required").max(200),
  cost: z.string().optional(),
  remarks: z.string().optional(),
  bill_photo: z.instanceof(File).optional(),
});

const AddService = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [billPhotoPreview, setBillPhotoPreview] = useState<string | null>(null);
  const [vendorSearchOpen, setVendorSearchOpen] = useState(false);
  const [equipmentSearchOpen, setEquipmentSearchOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "pending",
      service_type: undefined,
      department: "",
      equipment_id: "",
      nature_of_service: undefined,
      service_date: new Date().toISOString().split('T')[0],
      technician_vendor_name: "",
      cost: "",
      remarks: "",
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

  // Common vendor names for autocomplete
  const commonVendors = useMemo(() => [
    "HP Service Center",
    "Dell Technical Support",
    "Canon India Pvt Ltd",
    "Tata Technologies",
    "Wipro Infrastructure",
    "In-house Maintenance Team",
    "College IT Department",
    "Lab Equipment Services",
  ], []);

  // Filter equipment by selected department
  const selectedDepartment = form.watch("department");
  const selectedEquipmentId = form.watch("equipment_id");
  
  const filteredEquipment = useMemo(() => 
    equipment?.filter((item) => item.department === selectedDepartment) || [],
    [equipment, selectedDepartment]
  );

  const selectedEquipment = useMemo(() => 
    equipment?.find((item) => item.id === selectedEquipmentId),
    [equipment, selectedEquipmentId]
  );

  const handleBillPhotoChange = (file: File | null) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, JPG, or PNG file",
          variant: "destructive",
        });
        return;
      }

      form.setValue("bill_photo", file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setBillPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setBillPhotoPreview('pdf');
      }
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
        title: "Service Registered Successfully",
        description: "The service entry has been added to the system.",
      });

      navigate("/services");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register service. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    setIsSavingDraft(true);
    // Simulate saving draft to localStorage
    const draftData = form.getValues();
    localStorage.setItem('service_draft', JSON.stringify(draftData));
    
    setTimeout(() => {
      setIsSavingDraft(false);
      toast({
        title: "Draft Saved",
        description: "Your service entry has been saved as a draft.",
      });
    }, 500);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/services")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Register New Service</h1>
              <p className="text-muted-foreground text-sm md:text-base mt-0.5">
                Add equipment service or stock entry to the inventory system
              </p>
            </div>
          </div>
          <Badge variant="outline" className="hidden md:flex items-center gap-1.5 px-3 py-1.5">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            Draft Mode
          </Badge>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Service Type Section */}
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Service Type</CardTitle>
                    <CardDescription>Select the type of service being registered</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="service_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                          <Label
                            htmlFor="internal"
                            className={cn(
                              "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                              field.value === "internal" ? "border-primary bg-primary/5" : "border-muted"
                            )}
                          >
                            <RadioGroupItem value="internal" id="internal" />
                            <div className="flex-1">
                              <p className="font-semibold">Internal Service</p>
                              <p className="text-sm text-muted-foreground">
                                Performed by in-house staff or college team
                              </p>
                            </div>
                            {field.value === "internal" && (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            )}
                          </Label>
                          <Label
                            htmlFor="external"
                            className={cn(
                              "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                              field.value === "external" ? "border-primary bg-primary/5" : "border-muted"
                            )}
                          >
                            <RadioGroupItem value="external" id="external" />
                            <div className="flex-1">
                              <p className="font-semibold">External Service</p>
                              <p className="text-sm text-muted-foreground">
                                Performed by third-party vendor or contractor
                              </p>
                            </div>
                            {field.value === "external" && (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            )}
                          </Label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Vendor Information */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <User className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Vendor / Technician Details</CardTitle>
                    <CardDescription>Enter the service provider information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="technician_vendor_name"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Vendor / Technician Name <span className="text-destructive">*</span></FormLabel>
                      <Popover open={vendorSearchOpen} onOpenChange={setVendorSearchOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between h-10 font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value || "Search or enter vendor name..."}
                              <User className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Type vendor name..." 
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                            <CommandList>
                              <CommandEmpty>
                                <div className="py-2 px-3 text-sm">
                                  Press enter to use "<span className="font-medium">{field.value}</span>"
                                </div>
                              </CommandEmpty>
                              <CommandGroup heading="Suggestions">
                                {commonVendors.map((vendor) => (
                                  <CommandItem
                                    key={vendor}
                                    value={vendor}
                                    onSelect={() => {
                                      field.onChange(vendor);
                                      setVendorSearchOpen(false);
                                    }}
                                  >
                                    {vendor}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Start typing to search or enter a new vendor name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Department & Equipment Selection */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Department & Equipment</CardTitle>
                    <CardDescription>Select the department and equipment for this service</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department <span className="text-destructive">*</span></FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("equipment_id", ""); // Reset equipment when department changes
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
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
                    name="equipment_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Equipment Item <span className="text-destructive">*</span></FormLabel>
                        <Popover open={equipmentSearchOpen} onOpenChange={setEquipmentSearchOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                disabled={!selectedDepartment}
                                className={cn(
                                  "w-full justify-between h-10 font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {selectedEquipment ? (
                                  <span className="truncate">
                                    {selectedEquipment.name}
                                    {selectedEquipment.serial_number && ` (${selectedEquipment.serial_number})`}
                                  </span>
                                ) : (
                                  "Search equipment..."
                                )}
                                <Package className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search equipment..." />
                              <CommandList>
                                <CommandEmpty>No equipment found.</CommandEmpty>
                                <CommandGroup>
                                  {filteredEquipment.map((item) => (
                                    <CommandItem
                                      key={item.id}
                                      value={`${item.name} ${item.model || ''} ${item.serial_number || ''}`}
                                      onSelect={() => {
                                        field.onChange(item.id);
                                        setEquipmentSearchOpen(false);
                                      }}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {item.name}
                                          {item.serial_number && (
                                            <span className="text-muted-foreground font-normal"> ({item.serial_number})</span>
                                          )}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {item.model && `${item.model}`}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {!selectedDepartment && (
                          <FormDescription>Select a department first</FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedEquipment && (
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm font-medium mb-2">Selected Equipment Details</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-medium">{selectedEquipment.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Category</p>
                        <p className="font-medium">{selectedEquipment.category || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Model</p>
                        <p className="font-medium">{selectedEquipment.model || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Serial No.</p>
                        <p className="font-medium">{selectedEquipment.serial_number || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <FileText className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Service Details</CardTitle>
                    <CardDescription>Specify the nature, date, and cost of service</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="nature_of_service"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nature of Service <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="maintenance">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                Maintenance
                              </div>
                            </SelectItem>
                            <SelectItem value="repair">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                Repair
                              </div>
                            </SelectItem>
                            <SelectItem value="calibration">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                Calibration
                              </div>
                            </SelectItem>
                            <SelectItem value="installation">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                Installation
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                    name="service_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Service <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="date" className="pl-10" {...field} />
                          </div>
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
                        <FormLabel>Service Cost</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>Optional - Enter the service cost in INR</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks / Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional notes, observations, or instructions related to this service..."
                          className="min-h-[100px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional - Add any relevant details about the service
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Bill Upload Section */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Upload className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Bill / Invoice Upload</CardTitle>
                    <CardDescription>Attach the service bill or invoice for records</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!billPhotoPreview ? (
                    <label
                      htmlFor="bill-upload"
                      className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, PNG, or JPG (Max 5MB)
                        </p>
                      </div>
                      <Input
                        id="bill-upload"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => handleBillPhotoChange(e.target.files?.[0] || null)}
                      />
                    </label>
                  ) : (
                    <div className="relative border rounded-lg p-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => {
                          handleBillPhotoChange(null);
                          const input = document.getElementById("bill-upload") as HTMLInputElement;
                          if (input) input.value = "";
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      
                      {billPhotoPreview === 'pdf' ? (
                        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                          <FileText className="h-10 w-10 text-red-500" />
                          <div>
                            <p className="font-medium">{form.getValues("bill_photo")?.name}</p>
                            <p className="text-sm text-muted-foreground">PDF Document</p>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={billPhotoPreview}
                          alt="Bill preview"
                          className="max-h-64 mx-auto rounded-lg object-contain"
                        />
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/services")}
                className="sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="sm:w-auto"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save as Draft
                  </>
                )}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="sm:flex-1 md:flex-none md:min-w-[200px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submit Entry
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
};

export default AddService;
