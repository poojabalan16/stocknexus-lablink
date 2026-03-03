export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_resolved: boolean | null
          item_id: string | null
          message: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          item_id?: string | null
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          item_id?: string | null
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      grievances: {
        Row: {
          attachment_url: string | null
          course_id: string | null
          course_name: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          cabin_number: string | null
          category: string | null
          created_at: string
          created_by: string | null
          department: Database["public"]["Enums"]["department"]
          id: string
          image_url: string | null
          is_working: boolean
          item_status: string
          lecture_book_number: string | null
          location: string | null
          low_stock_threshold: number | null
          model: string | null
          name: string
          quantity: number
          serial_number: string | null
          specifications: Json | null
          status: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          cabin_number?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          department: Database["public"]["Enums"]["department"]
          id?: string
          image_url?: string | null
          is_working?: boolean
          item_status?: string
          lecture_book_number?: string | null
          location?: string | null
          low_stock_threshold?: number | null
          model?: string | null
          name: string
          quantity?: number
          serial_number?: string | null
          specifications?: Json | null
          status?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          cabin_number?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          department?: Database["public"]["Enums"]["department"]
          id?: string
          image_url?: string | null
          is_working?: boolean
          item_status?: string
          lecture_book_number?: string | null
          location?: string | null
          low_stock_threshold?: number | null
          model?: string | null
          name?: string
          quantity?: number
          serial_number?: string | null
          specifications?: Json | null
          status?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      item_movements: {
        Row: {
          created_at: string
          from_department: Database["public"]["Enums"]["department"]
          id: string
          is_deleted: boolean
          item_name: string
          lecture_book_number: string | null
          moved_by: string | null
          movement_date: string
          quantity: number
          reason: string | null
          to_department: Database["public"]["Enums"]["department"]
        }
        Insert: {
          created_at?: string
          from_department: Database["public"]["Enums"]["department"]
          id?: string
          is_deleted?: boolean
          item_name: string
          lecture_book_number?: string | null
          moved_by?: string | null
          movement_date?: string
          quantity?: number
          reason?: string | null
          to_department: Database["public"]["Enums"]["department"]
        }
        Update: {
          created_at?: string
          from_department?: Database["public"]["Enums"]["department"]
          id?: string
          is_deleted?: boolean
          item_name?: string
          lecture_book_number?: string | null
          moved_by?: string | null
          movement_date?: string
          quantity?: number
          reason?: string | null
          to_department?: Database["public"]["Enums"]["department"]
        }
        Relationships: []
      }
      item_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attachment_url: string | null
          created_at: string
          id: string
          is_deleted: boolean
          item_name: string
          lecture_book_number: string | null
          movement_id: string | null
          priority: string
          quantity_requested: number
          rejection_reason: string | null
          remarks: string | null
          requested_by: string
          requested_from_department: Database["public"]["Enums"]["department"]
          requesting_department: Database["public"]["Enums"]["department"]
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          item_name: string
          lecture_book_number?: string | null
          movement_id?: string | null
          priority?: string
          quantity_requested?: number
          rejection_reason?: string | null
          remarks?: string | null
          requested_by: string
          requested_from_department: Database["public"]["Enums"]["department"]
          requesting_department: Database["public"]["Enums"]["department"]
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          item_name?: string
          lecture_book_number?: string | null
          movement_id?: string | null
          priority?: string
          quantity_requested?: number
          rejection_reason?: string | null
          remarks?: string | null
          requested_by?: string
          requested_from_department?: Database["public"]["Enums"]["department"]
          requesting_department?: Database["public"]["Enums"]["department"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_requests_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "item_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          department: Database["public"]["Enums"]["department"] | null
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          email: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          purchase_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          purchase_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          purchase_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_attachments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          base_amount: number
          bill_invoice_number: string
          billing_period: Database["public"]["Enums"]["billing_period"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          department: Database["public"]["Enums"]["department"]
          due_date: string | null
          gst_amount: number | null
          gst_applicable: boolean
          gst_percentage: number | null
          id: string
          invoice_date: string
          is_deleted: boolean
          item_category: Database["public"]["Enums"]["item_category"]
          item_description: string | null
          item_name: string
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          purchase_date: string
          purchase_type: Database["public"]["Enums"]["purchase_type"]
          quantity: number | null
          reference_order_number: string | null
          remarks: string | null
          total_amount: number
          unit_price: number | null
          updated_at: string
          vendor_category: Database["public"]["Enums"]["vendor_category"]
          vendor_contact: string | null
          vendor_gst_number: string | null
          vendor_name: string
        }
        Insert: {
          base_amount?: number
          bill_invoice_number: string
          billing_period?: Database["public"]["Enums"]["billing_period"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department: Database["public"]["Enums"]["department"]
          due_date?: string | null
          gst_amount?: number | null
          gst_applicable?: boolean
          gst_percentage?: number | null
          id?: string
          invoice_date: string
          is_deleted?: boolean
          item_category: Database["public"]["Enums"]["item_category"]
          item_description?: string | null
          item_name: string
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          purchase_date?: string
          purchase_type: Database["public"]["Enums"]["purchase_type"]
          quantity?: number | null
          reference_order_number?: string | null
          remarks?: string | null
          total_amount?: number
          unit_price?: number | null
          updated_at?: string
          vendor_category: Database["public"]["Enums"]["vendor_category"]
          vendor_contact?: string | null
          vendor_gst_number?: string | null
          vendor_name: string
        }
        Update: {
          base_amount?: number
          bill_invoice_number?: string
          billing_period?: Database["public"]["Enums"]["billing_period"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: Database["public"]["Enums"]["department"]
          due_date?: string | null
          gst_amount?: number | null
          gst_applicable?: boolean
          gst_percentage?: number | null
          id?: string
          invoice_date?: string
          is_deleted?: boolean
          item_category?: Database["public"]["Enums"]["item_category"]
          item_description?: string | null
          item_name?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          purchase_date?: string
          purchase_type?: Database["public"]["Enums"]["purchase_type"]
          quantity?: number | null
          reference_order_number?: string | null
          remarks?: string | null
          total_amount?: number
          unit_price?: number | null
          updated_at?: string
          vendor_category?: Database["public"]["Enums"]["vendor_category"]
          vendor_contact?: string | null
          vendor_gst_number?: string | null
          vendor_name?: string
        }
        Relationships: []
      }
      registration_requests: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["department"]
          email: string
          full_name: string
          id: string
          justification: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          department: Database["public"]["Enums"]["department"]
          email: string
          full_name: string
          id?: string
          justification?: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["department"]
          email?: string
          full_name?: string
          id?: string
          justification?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      scrap_items: {
        Row: {
          bill_url: string | null
          created_at: string
          department: Database["public"]["Enums"]["department"]
          disposal_certificate_url: string | null
          id: string
          item_id: string | null
          item_model: string | null
          item_name: string
          item_serial_number: string | null
          lecture_book_number: string | null
          notes: string | null
          quantity: number
          reason: string
          scrap_value: number | null
          scrapped_at: string
          scrapped_by: string
          vendor_contact: string | null
          vendor_name: string | null
        }
        Insert: {
          bill_url?: string | null
          created_at?: string
          department: Database["public"]["Enums"]["department"]
          disposal_certificate_url?: string | null
          id?: string
          item_id?: string | null
          item_model?: string | null
          item_name: string
          item_serial_number?: string | null
          lecture_book_number?: string | null
          notes?: string | null
          quantity?: number
          reason: string
          scrap_value?: number | null
          scrapped_at?: string
          scrapped_by: string
          vendor_contact?: string | null
          vendor_name?: string | null
        }
        Update: {
          bill_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department"]
          disposal_certificate_url?: string | null
          id?: string
          item_id?: string | null
          item_model?: string | null
          item_name?: string
          item_serial_number?: string | null
          lecture_book_number?: string | null
          notes?: string | null
          quantity?: number
          reason?: string
          scrap_value?: number | null
          scrapped_at?: string
          scrapped_by?: string
          vendor_contact?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrap_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          amount_paid: number | null
          bill_photo_url: string | null
          cost: number | null
          created_at: string
          created_by: string | null
          department: Database["public"]["Enums"]["department"]
          equipment_id: string
          id: string
          nature_of_service: Database["public"]["Enums"]["nature_of_service"]
          payment_date: string | null
          payment_mode: string | null
          payment_proof_url: string | null
          payment_status: string | null
          remarks: string | null
          service_date: string
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["service_status"]
          technician_vendor_name: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          bill_photo_url?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          department: Database["public"]["Enums"]["department"]
          equipment_id: string
          id?: string
          nature_of_service: Database["public"]["Enums"]["nature_of_service"]
          payment_date?: string | null
          payment_mode?: string | null
          payment_proof_url?: string | null
          payment_status?: string | null
          remarks?: string | null
          service_date: string
          service_type: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["service_status"]
          technician_vendor_name: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          bill_photo_url?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          department?: Database["public"]["Enums"]["department"]
          equipment_id?: string
          id?: string
          nature_of_service?: Database["public"]["Enums"]["nature_of_service"]
          payment_date?: string | null
          payment_mode?: string | null
          payment_proof_url?: string | null
          payment_status?: string | null
          remarks?: string | null
          service_date?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["service_status"]
          technician_vendor_name?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["department"] | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_department: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["department"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      setup_admin_account: {
        Args: {
          admin_department: Database["public"]["Enums"]["department"]
          admin_email: string
          admin_full_name: string
          admin_password: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "hod" | "staff"
      billing_period: "one_time" | "monthly" | "quarterly" | "annual"
      department:
        | "IT"
        | "AI&DS"
        | "CSE"
        | "Physics"
        | "Chemistry"
        | "Bio-tech"
        | "Chemical"
        | "Mechanical"
        | "Accounts"
        | "Exam Cell"
        | "Library"
        | "ECE"
        | "EEE"
        | "CIVIL"
        | "CSBS"
        | "MBA"
        | "Main Stock"
      item_category:
        | "hardware"
        | "network"
        | "software"
        | "office"
        | "lab"
        | "other"
      item_status:
        | "working"
        | "scrap"
        | "outdated"
        | "under_maintenance"
        | "available"
      nature_of_service:
        | "maintenance"
        | "repair"
        | "calibration"
        | "installation"
      payment_mode: "cash" | "cheque" | "neft" | "rtgs" | "upi"
      payment_status: "paid" | "pending" | "partially_paid"
      purchase_type:
        | "asset"
        | "consumable"
        | "service"
        | "subscription"
        | "utility"
      service_status: "pending" | "in_progress" | "completed"
      service_type: "internal" | "external"
      vendor_category:
        | "asset_vendor"
        | "service_provider"
        | "utility"
        | "software_vendor"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "hod", "staff"],
      billing_period: ["one_time", "monthly", "quarterly", "annual"],
      department: [
        "IT",
        "AI&DS",
        "CSE",
        "Physics",
        "Chemistry",
        "Bio-tech",
        "Chemical",
        "Mechanical",
        "Accounts",
        "Exam Cell",
        "Library",
        "ECE",
        "EEE",
        "CIVIL",
        "CSBS",
        "MBA",
        "Main Stock",
      ],
      item_category: [
        "hardware",
        "network",
        "software",
        "office",
        "lab",
        "other",
      ],
      item_status: [
        "working",
        "scrap",
        "outdated",
        "under_maintenance",
        "available",
      ],
      nature_of_service: [
        "maintenance",
        "repair",
        "calibration",
        "installation",
      ],
      payment_mode: ["cash", "cheque", "neft", "rtgs", "upi"],
      payment_status: ["paid", "pending", "partially_paid"],
      purchase_type: [
        "asset",
        "consumable",
        "service",
        "subscription",
        "utility",
      ],
      service_status: ["pending", "in_progress", "completed"],
      service_type: ["internal", "external"],
      vendor_category: [
        "asset_vendor",
        "service_provider",
        "utility",
        "software_vendor",
        "other",
      ],
    },
  },
} as const
