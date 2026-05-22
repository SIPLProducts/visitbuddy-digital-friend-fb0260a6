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
      accompanying_visitors: {
        Row: {
          created_at: string | null
          has_laptop: boolean | null
          has_mobile: boolean | null
          id: string
          laptop_brand: string | null
          laptop_serial: string | null
          mobile_brand: string | null
          mobile_serial: string | null
          name: string
          phone: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string | null
          has_laptop?: boolean | null
          has_mobile?: boolean | null
          id?: string
          laptop_brand?: string | null
          laptop_serial?: string | null
          mobile_brand?: string | null
          mobile_serial?: string | null
          name: string
          phone?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string | null
          has_laptop?: boolean | null
          has_mobile?: boolean | null
          id?: string
          laptop_brand?: string | null
          laptop_serial?: string | null
          mobile_brand?: string | null
          mobile_serial?: string | null
          name?: string
          phone?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accompanying_visitors_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      anpr_events: {
        Row: {
          created_at: string
          event_time: string
          gate_id: string | null
          id: string
          image_url: string | null
          location_id: string | null
          match_status: string
          matched_vehicle_id: string | null
          plate_number: string
        }
        Insert: {
          created_at?: string
          event_time?: string
          gate_id?: string | null
          id?: string
          image_url?: string | null
          location_id?: string | null
          match_status?: string
          matched_vehicle_id?: string | null
          plate_number: string
        }
        Update: {
          created_at?: string
          event_time?: string
          gate_id?: string | null
          id?: string
          image_url?: string | null
          location_id?: string | null
          match_status?: string
          matched_vehicle_id?: string | null
          plate_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "anpr_events_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anpr_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anpr_events_matched_vehicle_id_fkey"
            columns: ["matched_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          location_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          location_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          location_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          active_visitors: number | null
          building_section: string | null
          created_at: string
          description: string | null
          employee_count: number | null
          floor_number: string | null
          id: string
          location: string | null
          location_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          active_visitors?: number | null
          building_section?: string | null
          created_at?: string
          description?: string | null
          employee_count?: number | null
          floor_number?: string | null
          id?: string
          location?: string | null
          location_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          active_visitors?: number | null
          building_section?: string | null
          created_at?: string
          description?: string | null
          employee_count?: number | null
          floor_number?: string | null
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
      email_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          sender_email: string
          sender_name: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_username: string
          updated_at: string
          use_tls: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          sender_email: string
          sender_name?: string
          smtp_host: string
          smtp_password: string
          smtp_port?: number
          smtp_username: string
          updated_at?: string
          use_tls?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          sender_email?: string
          sender_name?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_username?: string
          updated_at?: string
          use_tls?: boolean
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          body: string | null
          cc: string[] | null
          id: string
          recipients: string[]
          sent_at: string | null
          status: string | null
          subject: string
          template: string | null
        }
        Insert: {
          body?: string | null
          cc?: string[] | null
          id?: string
          recipients: string[]
          sent_at?: string | null
          status?: string | null
          subject: string
          template?: string | null
        }
        Update: {
          body?: string | null
          cc?: string[] | null
          id?: string
          recipients?: string[]
          sent_at?: string | null
          status?: string | null
          subject?: string
          template?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_template: string
          cc_emails: string[] | null
          created_at: string | null
          id: string
          is_active: boolean | null
          subject_template: string
          template_key: string
          to_emails: string[] | null
          updated_at: string | null
        }
        Insert: {
          body_template: string
          cc_emails?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subject_template: string
          template_key: string
          to_emails?: string[] | null
          updated_at?: string | null
        }
        Update: {
          body_template?: string
          cc_emails?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subject_template?: string
          template_key?: string
          to_emails?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
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
          phone: string | null
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
          phone?: string | null
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
          phone?: string | null
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
      frequent_visitors: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          govt_id_number: string | null
          id: string
          last_visit_at: string | null
          name: string | null
          phone: string
          updated_at: string
          visit_count: number
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          govt_id_number?: string | null
          id?: string
          last_visit_at?: string | null
          name?: string | null
          phone: string
          updated_at?: string
          visit_count?: number
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          govt_id_number?: string | null
          id?: string
          last_visit_at?: string | null
          name?: string | null
          phone?: string
          updated_at?: string
          visit_count?: number
        }
        Relationships: []
      }
      gates: {
        Row: {
          building: string | null
          camera_enabled: boolean | null
          camera_type: string | null
          camera_url: string | null
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
          camera_enabled?: boolean | null
          camera_type?: string | null
          camera_url?: string | null
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
          camera_enabled?: boolean | null
          camera_type?: string | null
          camera_url?: string | null
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
          assembly_point: string | null
          capacity_usage: number | null
          city: string | null
          country: string | null
          created_at: string
          department_count: number | null
          email: string | null
          emergency_contact: string | null
          gate_count: number | null
          geo_address: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          plant_code: string | null
          safety_short_code: string | null
          status: Database["public"]["Enums"]["location_status"] | null
          updated_at: string
          visitor_count: number | null
        }
        Insert: {
          address?: string | null
          assembly_point?: string | null
          capacity_usage?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          department_count?: number | null
          email?: string | null
          emergency_contact?: string | null
          gate_count?: number | null
          geo_address?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          plant_code?: string | null
          safety_short_code?: string | null
          status?: Database["public"]["Enums"]["location_status"] | null
          updated_at?: string
          visitor_count?: number | null
        }
        Update: {
          address?: string | null
          assembly_point?: string | null
          capacity_usage?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          department_count?: number | null
          email?: string | null
          emergency_contact?: string | null
          gate_count?: number | null
          geo_address?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          plant_code?: string | null
          safety_short_code?: string | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          employee_id: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          employee_id?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          employee_id?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      role_screen_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          location_id: string
          role: Database["public"]["Enums"]["app_role"]
          screen_id: string
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          location_id: string
          role: Database["public"]["Enums"]["app_role"]
          screen_id: string
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          location_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          screen_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_screen_permissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_screen_permissions_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
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
      sms_logs: {
        Row: {
          created_at: string
          http_status: number | null
          id: string
          message: string
          provider: string
          provider_job_id: string | null
          provider_message: string | null
          provider_status_code: string | null
          raw_response: string | null
          recipient_phone: string
          sender_id: string | null
          status: string
          visitor_code: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          http_status?: number | null
          id?: string
          message: string
          provider?: string
          provider_job_id?: string | null
          provider_message?: string | null
          provider_status_code?: string | null
          raw_response?: string | null
          recipient_phone: string
          sender_id?: string | null
          status?: string
          visitor_code?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          http_status?: number | null
          id?: string
          message?: string
          provider?: string
          provider_job_id?: string | null
          provider_message?: string | null
          provider_status_code?: string | null
          raw_response?: string | null
          recipient_phone?: string
          sender_id?: string | null
          status?: string
          visitor_code?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      tenant_settings: {
        Row: {
          auto_checkout_hours: number | null
          badge_footer_text: string | null
          badge_logo_url: string | null
          company_name: string
          created_at: string
          data_retention_days: number | null
          email_footer_text: string | null
          email_header_text: string | null
          enable_nda: boolean | null
          enable_photo_capture: boolean | null
          enable_watchlist_check: boolean | null
          id: string
          logo_url: string | null
          nda_text: string | null
          primary_color: string | null
          public_app_url: string | null
          secondary_color: string | null
          session_timeout_minutes: number | null
          updated_at: string
          whatsapp_provider: string
        }
        Insert: {
          auto_checkout_hours?: number | null
          badge_footer_text?: string | null
          badge_logo_url?: string | null
          company_name?: string
          created_at?: string
          data_retention_days?: number | null
          email_footer_text?: string | null
          email_header_text?: string | null
          enable_nda?: boolean | null
          enable_photo_capture?: boolean | null
          enable_watchlist_check?: boolean | null
          id?: string
          logo_url?: string | null
          nda_text?: string | null
          primary_color?: string | null
          public_app_url?: string | null
          secondary_color?: string | null
          session_timeout_minutes?: number | null
          updated_at?: string
          whatsapp_provider?: string
        }
        Update: {
          auto_checkout_hours?: number | null
          badge_footer_text?: string | null
          badge_logo_url?: string | null
          company_name?: string
          created_at?: string
          data_retention_days?: number | null
          email_footer_text?: string | null
          email_header_text?: string | null
          enable_nda?: boolean | null
          enable_photo_capture?: boolean | null
          enable_watchlist_check?: boolean | null
          id?: string
          logo_url?: string | null
          nda_text?: string | null
          primary_color?: string | null
          public_app_url?: string | null
          secondary_color?: string | null
          session_timeout_minutes?: number | null
          updated_at?: string
          whatsapp_provider?: string
        }
        Relationships: []
      }
      user_location_roles: {
        Row: {
          created_at: string
          id: string
          is_admin_head: boolean
          is_ho_admin: boolean
          location_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_head?: boolean
          is_ho_admin?: boolean
          location_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_head?: boolean
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
      vehicle_entries: {
        Row: {
          created_at: string
          entry_time: string
          exit_time: string | null
          gate_id: string | null
          id: string
          location_id: string | null
          purpose: string | null
          remarks: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          entry_time?: string
          exit_time?: string | null
          gate_id?: string | null
          id?: string
          location_id?: string | null
          purpose?: string | null
          remarks?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          entry_time?: string
          exit_time?: string | null
          gate_id?: string | null
          id?: string
          location_id?: string | null
          purpose?: string | null
          remarks?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_entries_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_entries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          auto_allow: boolean | null
          check_in_time: string | null
          check_out_time: string | null
          company: string | null
          created_at: string
          department_id: string | null
          driver_license: string | null
          driver_name: string
          driver_phone: string | null
          employee_id: string | null
          gate_id: string | null
          id: string
          is_employee_vehicle: boolean | null
          location_id: string | null
          purpose: string | null
          qr_code: string | null
          status: string | null
          updated_at: string
          vehicle_id: string
          vehicle_number: string
          vehicle_type: string
        }
        Insert: {
          auto_allow?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          company?: string | null
          created_at?: string
          department_id?: string | null
          driver_license?: string | null
          driver_name: string
          driver_phone?: string | null
          employee_id?: string | null
          gate_id?: string | null
          id?: string
          is_employee_vehicle?: boolean | null
          location_id?: string | null
          purpose?: string | null
          qr_code?: string | null
          status?: string | null
          updated_at?: string
          vehicle_id: string
          vehicle_number: string
          vehicle_type?: string
        }
        Update: {
          auto_allow?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          company?: string | null
          created_at?: string
          department_id?: string | null
          driver_license?: string | null
          driver_name?: string
          driver_phone?: string | null
          employee_id?: string | null
          gate_id?: string | null
          id?: string
          is_employee_vehicle?: boolean | null
          location_id?: string | null
          purpose?: string | null
          qr_code?: string | null
          status?: string | null
          updated_at?: string
          vehicle_id?: string
          vehicle_number?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_agreements: {
        Row: {
          agreement_text: string
          agreement_type: string
          created_at: string
          id: string
          ip_address: string | null
          signature_data: string | null
          signed_at: string
          visitor_id: string
        }
        Insert: {
          agreement_text: string
          agreement_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          signed_at?: string
          visitor_id: string
        }
        Update: {
          agreement_text?: string
          agreement_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          signed_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      visitor_id_counters: {
        Row: {
          last_seq: number
          location_key: string
          updated_at: string
        }
        Insert: {
          last_seq?: number
          location_key: string
          updated_at?: string
        }
        Update: {
          last_seq?: number
          location_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      visitor_watchlist: {
        Row: {
          added_by: string | null
          company: string | null
          created_at: string
          email: string | null
          govt_id_number: string | null
          id: string
          is_active: boolean
          location_id: string | null
          name: string
          phone: string | null
          photo_url: string | null
          reason: string
          severity: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          govt_id_number?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          reason: string
          severity?: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          govt_id_number?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          reason?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      visitors: {
        Row: {
          accompanying_count: number | null
          badge_printed: boolean | null
          check_in_time: string | null
          check_out_time: string | null
          checkout_method: string | null
          company: string | null
          created_at: string
          created_by_user_id: string | null
          department_id: string | null
          email: string | null
          gate_id: string | null
          govt_id_number: string | null
          has_laptop: boolean | null
          has_mobile: boolean | null
          host_id: string | null
          id: string
          laptop_brand: string | null
          laptop_serial: string | null
          mobile_brand: string | null
          mobile_serial: string | null
          name: string
          phone: string | null
          photo_url: string | null
          purpose: string | null
          qr_code: string | null
          scheduled_date: string | null
          short_code: string | null
          status: Database["public"]["Enums"]["visitor_status"] | null
          updated_at: string
          vehicle_number: string | null
          vehicle_type: string | null
          visitor_id: string
        }
        Insert: {
          accompanying_count?: number | null
          badge_printed?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          checkout_method?: string | null
          company?: string | null
          created_at?: string
          created_by_user_id?: string | null
          department_id?: string | null
          email?: string | null
          gate_id?: string | null
          govt_id_number?: string | null
          has_laptop?: boolean | null
          has_mobile?: boolean | null
          host_id?: string | null
          id?: string
          laptop_brand?: string | null
          laptop_serial?: string | null
          mobile_brand?: string | null
          mobile_serial?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          purpose?: string | null
          qr_code?: string | null
          scheduled_date?: string | null
          short_code?: string | null
          status?: Database["public"]["Enums"]["visitor_status"] | null
          updated_at?: string
          vehicle_number?: string | null
          vehicle_type?: string | null
          visitor_id: string
        }
        Update: {
          accompanying_count?: number | null
          badge_printed?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          checkout_method?: string | null
          company?: string | null
          created_at?: string
          created_by_user_id?: string | null
          department_id?: string | null
          email?: string | null
          gate_id?: string | null
          govt_id_number?: string | null
          has_laptop?: boolean | null
          has_mobile?: boolean | null
          host_id?: string | null
          id?: string
          laptop_brand?: string | null
          laptop_serial?: string | null
          mobile_brand?: string | null
          mobile_serial?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          purpose?: string | null
          qr_code?: string | null
          scheduled_date?: string | null
          short_code?: string | null
          status?: Database["public"]["Enums"]["visitor_status"] | null
          updated_at?: string
          vehicle_number?: string | null
          vehicle_type?: string | null
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
      generate_location_safety_short_code: { Args: never; Returns: string }
      generate_visitor_short_code: { Args: never; Returns: string }
      get_admin_location_ids: { Args: { _user_id: string }; Returns: string[] }
      get_location_safety_by_code: {
        Args: { _code: string }
        Returns: {
          address: string
          assembly_point: string
          city: string
          emergency_contact: string
          geo_address: string
          latitude: number
          longitude: number
          name: string
          phone: string
        }[]
      }
      get_user_location_ids: { Args: { _user_id: string }; Returns: string[] }
      get_visitor_id_by_short_code: {
        Args: { _short_code: string }
        Returns: string
      }
      has_role_at_location: {
        Args: {
          _location_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_head: { Args: { _user_id: string }; Returns: boolean }
      is_ho_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "operator" | "gate_security" | "visitor"
      appointment_status: "pending" | "confirmed" | "cancelled" | "completed"
      gate_status: "active" | "inactive"
      location_status: "active" | "inactive"
      visitor_status:
        | "checked_in"
        | "checked_out"
        | "scheduled"
        | "cancelled"
        | "pending_approval"
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
      app_role: ["admin", "manager", "operator", "gate_security", "visitor"],
      appointment_status: ["pending", "confirmed", "cancelled", "completed"],
      gate_status: ["active", "inactive"],
      location_status: ["active", "inactive"],
      visitor_status: [
        "checked_in",
        "checked_out",
        "scheduled",
        "cancelled",
        "pending_approval",
      ],
    },
  },
} as const
