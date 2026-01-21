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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          company: string | null
          created_at: string
          department_id: string | null
          duration_minutes: number | null
          has_teams_meeting: boolean | null
          host_id: string | null
          id: string
          notes: string | null
          purpose: string | null
          scheduled_date: string
          scheduled_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string
          visitor_email: string | null
          visitor_name: string
          visitor_phone: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          department_id?: string | null
          duration_minutes?: number | null
          has_teams_meeting?: boolean | null
          host_id?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string
          visitor_email?: string | null
          visitor_name: string
          visitor_phone?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          department_id?: string | null
          duration_minutes?: number | null
          has_teams_meeting?: boolean | null
          host_id?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string
          visitor_email?: string | null
          visitor_name?: string
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          active_visitors: number | null
          created_at: string
          description: string | null
          employee_count: number | null
          id: string
          location: string | null
          location_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          active_visitors?: number | null
          created_at?: string
          description?: string | null
          employee_count?: number | null
          id?: string
          location?: string | null
          location_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          active_visitors?: number | null
          created_at?: string
          description?: string | null
          employee_count?: number | null
          id?: string
          location?: string | null
          location_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          department_id: string | null
          email: string | null
          employee_id: string
          id: string
          is_host: boolean | null
          location_id: string | null
          name: string
          position: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          employee_id: string
          id?: string
          is_host?: boolean | null
          location_id?: string | null
          name: string
          position?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          employee_id?: string
          id?: string
          is_host?: boolean | null
          location_id?: string | null
          name?: string
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      gates: {
        Row: {
          building: string | null
          capacity: number | null
          created_at: string
          current_visitors: number | null
          gate_type: string | null
          has_qr: boolean | null
          id: string
          location_id: string | null
          name: string
          operating_hours: string | null
          status: Database["public"]["Enums"]["gate_status"] | null
          updated_at: string
        }
        Insert: {
          building?: string | null
          capacity?: number | null
          created_at?: string
          current_visitors?: number | null
          gate_type?: string | null
          has_qr?: boolean | null
          id?: string
          location_id?: string | null
          name: string
          operating_hours?: string | null
          status?: Database["public"]["Enums"]["gate_status"] | null
          updated_at?: string
        }
        Update: {
          building?: string | null
          capacity?: number | null
          created_at?: string
          current_visitors?: number | null
          gate_type?: string | null
          has_qr?: boolean | null
          id?: string
          location_id?: string | null
          name?: string
          operating_hours?: string | null
          status?: Database["public"]["Enums"]["gate_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          capacity_usage: number | null
          city: string | null
          country: string | null
          created_at: string
          department_count: number | null
          email: string | null
          gate_count: number | null
          id: string
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["location_status"] | null
          updated_at: string
          visitor_count: number | null
        }
        Insert: {
          address?: string | null
          capacity_usage?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          department_count?: number | null
          email?: string | null
          gate_count?: number | null
          id?: string
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["location_status"] | null
          updated_at?: string
          visitor_count?: number | null
        }
        Update: {
          address?: string | null
          capacity_usage?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          department_count?: number | null
          email?: string | null
          gate_count?: number | null
          id?: string
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["location_status"] | null
          updated_at?: string
          visitor_count?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_location_id: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_location_id?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_location_id?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      screens: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          path: string
          requires_admin: boolean | null
          requires_manager: boolean | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          path: string
          requires_admin?: boolean | null
          requires_manager?: boolean | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          path?: string
          requires_admin?: boolean | null
          requires_manager?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      user_location_roles: {
        Row: {
          created_at: string
          id: string
          is_ho_admin: boolean
          location_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_ho_admin?: boolean
          location_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_ho_admin?: boolean
          location_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_location_roles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          badge_printed: boolean | null
          check_in_time: string | null
          check_out_time: string | null
          company: string | null
          created_at: string
          department_id: string | null
          email: string | null
          gate_id: string | null
          has_laptop: boolean | null
          host_id: string | null
          id: string
          laptop_brand: string | null
          laptop_serial: string | null
          name: string
          phone: string | null
          photo_url: string | null
          purpose: string | null
          qr_code: string | null
          status: Database["public"]["Enums"]["visitor_status"] | null
          updated_at: string
          visitor_id: string
        }
        Insert: {
          badge_printed?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          company?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          gate_id?: string | null
          has_laptop?: boolean | null
          host_id?: string | null
          id?: string
          laptop_brand?: string | null
          laptop_serial?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          purpose?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["visitor_status"] | null
          updated_at?: string
          visitor_id: string
        }
        Update: {
          badge_printed?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          company?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          gate_id?: string | null
          has_laptop?: boolean | null
          host_id?: string | null
          id?: string
          laptop_brand?: string | null
          laptop_serial?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          purpose?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["visitor_status"] | null
          updated_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_location: {
        Args: { _location_id: string; _user_id: string }
        Returns: boolean
      }
      get_user_location_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role_at_location: {
        Args: {
          _location_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ho_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "operator"
      appointment_status: "pending" | "confirmed" | "cancelled" | "completed"
      gate_status: "active" | "inactive"
      location_status: "active" | "inactive"
      visitor_status: "checked_in" | "checked_out" | "scheduled" | "cancelled"
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
      app_role: ["admin", "manager", "operator"],
      appointment_status: ["pending", "confirmed", "cancelled", "completed"],
      gate_status: ["active", "inactive"],
      location_status: ["active", "inactive"],
      visitor_status: ["checked_in", "checked_out", "scheduled", "cancelled"],
    },
  },
} as const
