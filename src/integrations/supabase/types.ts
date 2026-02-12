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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          admin_email: string | null
          allow_mobile_clock_in: boolean | null
          auto_approve_time_off: boolean | null
          break_duration: number | null
          clock_in_grace_period: number | null
          clock_in_reminders: boolean | null
          company_name: string | null
          created_at: string
          data_retention_period: number | null
          id: string
          overtime_alerts: boolean | null
          overtime_threshold: number | null
          require_clock_in_location: boolean | null
          schedule_changes: boolean | null
          shift_reminders: boolean | null
          timezone: string | null
          updated_at: string
          user_id: string
          week_start_day: string | null
        }
        Insert: {
          admin_email?: string | null
          allow_mobile_clock_in?: boolean | null
          auto_approve_time_off?: boolean | null
          break_duration?: number | null
          clock_in_grace_period?: number | null
          clock_in_reminders?: boolean | null
          company_name?: string | null
          created_at?: string
          data_retention_period?: number | null
          id?: string
          overtime_alerts?: boolean | null
          overtime_threshold?: number | null
          require_clock_in_location?: boolean | null
          schedule_changes?: boolean | null
          shift_reminders?: boolean | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          week_start_day?: string | null
        }
        Update: {
          admin_email?: string | null
          allow_mobile_clock_in?: boolean | null
          auto_approve_time_off?: boolean | null
          break_duration?: number | null
          clock_in_grace_period?: number | null
          clock_in_reminders?: boolean | null
          company_name?: string | null
          created_at?: string
          data_retention_period?: number | null
          id?: string
          overtime_alerts?: boolean | null
          overtime_threshold?: number | null
          require_clock_in_location?: boolean | null
          schedule_changes?: boolean | null
          shift_reminders?: boolean | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          week_start_day?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          event_type: string | null
          files: Json | null
          id: string
          notes: string | null
          parent_task_id: string | null
          priority: string | null
          start_time: string | null
          template_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          files?: Json | null
          id?: string
          notes?: string | null
          parent_task_id?: string | null
          priority?: string | null
          start_time?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          files?: Json | null
          id?: string
          notes?: string | null
          parent_task_id?: string | null
          priority?: string | null
          start_time?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "learning_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          created_at: string
          files: Json | null
          id: string
          message: string | null
          message_type: string
          sender_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          files?: Json | null
          id?: string
          message?: string | null
          message_type?: string
          sender_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          files?: Json | null
          id?: string
          message?: string | null
          message_type?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "task_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          color: string | null
          company_manager_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          field_type: string | null
          id: string
          name: string
          operations_manager_id: string | null
          organization_id: string | null
          phone: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          color?: string | null
          company_manager_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          field_type?: string | null
          id?: string
          name: string
          operations_manager_id?: string | null
          organization_id?: string | null
          phone?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          color?: string | null
          company_manager_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          field_type?: string | null
          id?: string
          name?: string
          operations_manager_id?: string | null
          organization_id?: string | null
          phone?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_availability: {
        Row: {
          company_id: string
          created_at: string
          date: string
          employee_id: string
          end_time: string | null
          id: string
          notes: string | null
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          date: string
          employee_id: string
          end_time?: string | null
          id?: string
          notes?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          employee_id?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_availability_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_public"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_skills: {
        Row: {
          created_at: string
          employee_id: string | null
          id: string
          proficiency_level: string | null
          skill_id: string | null
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          id?: string
          proficiency_level?: string | null
          skill_id?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          id?: string
          proficiency_level?: string | null
          skill_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          company_id: string | null
          created_at: string
          department_id: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_pin: string | null
          first_name: string
          hire_date: string | null
          hourly_rate: number | null
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          position: string | null
          status: string
          team_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_pin?: string | null
          first_name: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_pin?: string | null
          first_name?: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "schedule_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number | null
          end_time: string
          id: string
          interruptions: number | null
          notes: string | null
          productivity_score: number | null
          start_time: string
          task_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          end_time: string
          id?: string
          interruptions?: number | null
          notes?: string | null
          productivity_score?: number | null
          start_time: string
          task_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          end_time?: string
          id?: string
          interruptions?: number | null
          notes?: string | null
          productivity_score?: number | null
          start_time?: string
          task_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_completions: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date?: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      habits: {
        Row: {
          best_streak: number
          category: string
          color: string
          created_at: string
          current_streak: number
          description: string | null
          end_date: string | null
          frequency: string
          id: string
          notes: string | null
          start_date: string | null
          start_time: string | null
          target_count: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          category?: string
          color?: string
          created_at?: string
          current_streak?: number
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          notes?: string | null
          start_date?: string | null
          start_time?: string | null
          target_count?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          category?: string
          color?: string
          created_at?: string
          current_streak?: number
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          notes?: string | null
          start_date?: string | null
          start_time?: string | null
          target_count?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          technology: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          technology: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          technology?: string
          updated_at?: string
        }
        Relationships: []
      }
      location_logs: {
        Row: {
          coordinates: Json | null
          created_at: string
          id: string
          location_address: string
          user_id: string
        }
        Insert: {
          coordinates?: Json | null
          created_at?: string
          id?: string
          location_address: string
          user_id: string
        }
        Update: {
          coordinates?: Json | null
          created_at?: string
          id?: string
          location_address?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address: string | null
          color: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          operations_manager_id: string | null
          organization_manager_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          operations_manager_id?: string | null
          organization_manager_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          operations_manager_id?: string | null
          organization_manager_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          manager_id: string | null
          mobile_number: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          manager_id?: string | null
          mobile_number?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          manager_id?: string | null
          mobile_number?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      schedule_teams: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          team_id: string | null
          template_data: Json | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          team_id?: string | null
          template_data?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          team_id?: string | null
          template_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "schedule_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_replacement_requests: {
        Row: {
          company_id: string
          created_at: string
          id: string
          original_employee_id: string
          replacement_employee_id: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          shift_id: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          original_employee_id: string
          replacement_employee_id: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          shift_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          original_employee_id?: string
          replacement_employee_id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          shift_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_replacement_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_replacement_requests_original_employee_id_fkey"
            columns: ["original_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_replacement_requests_original_employee_id_fkey"
            columns: ["original_employee_id"]
            isOneToOne: false
            referencedRelation: "employees_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_replacement_requests_replacement_employee_id_fkey"
            columns: ["replacement_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_replacement_requests_replacement_employee_id_fkey"
            columns: ["replacement_employee_id"]
            isOneToOne: false
            referencedRelation: "employees_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_replacement_requests_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number | null
          company_id: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          employee_id: string | null
          end_time: string
          hourly_rate: number | null
          id: string
          is_missed: boolean | null
          missed_at: string | null
          notes: string | null
          replacement_approved_at: string | null
          replacement_employee_id: string | null
          replacement_started_at: string | null
          start_time: string
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          break_minutes?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          employee_id?: string | null
          end_time: string
          hourly_rate?: number | null
          id?: string
          is_missed?: boolean | null
          missed_at?: string | null
          notes?: string | null
          replacement_approved_at?: string | null
          replacement_employee_id?: string | null
          replacement_started_at?: string | null
          start_time: string
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          break_minutes?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          employee_id?: string | null
          end_time?: string
          hourly_rate?: number | null
          id?: string
          is_missed?: boolean | null
          missed_at?: string | null
          notes?: string | null
          replacement_approved_at?: string | null
          replacement_employee_id?: string | null
          replacement_started_at?: string | null
          start_time?: string
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_replacement_employee_id_fkey"
            columns: ["replacement_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_replacement_employee_id_fkey"
            columns: ["replacement_employee_id"]
            isOneToOne: false
            referencedRelation: "employees_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "schedule_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      task_chats: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_chats_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notes: {
        Row: {
          author_id: string
          created_at: string
          files: Json | null
          id: string
          note_text: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          files?: Json | null
          id?: string
          note_text: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          files?: Json | null
          id?: string
          note_text?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_work_sessions: {
        Row: {
          created_at: string
          end_location: Json | null
          end_time: string | null
          id: string
          notes: string | null
          start_location: Json | null
          start_time: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_location?: Json | null
          end_time?: string | null
          id?: string
          notes?: string | null
          start_location?: Json | null
          start_time?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_location?: Json | null
          end_time?: string | null
          id?: string
          notes?: string | null
          start_location?: Json | null
          start_time?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      template_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "learning_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_tasks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          parent_task_id: string | null
          priority: string | null
          status: string | null
          template_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          parent_task_id?: string | null
          priority?: string | null
          status?: string | null
          template_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          parent_task_id?: string | null
          priority?: string | null
          status?: string | null
          template_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "template_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "learning_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock: {
        Row: {
          break_end: string | null
          break_start: string | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          employee_id: string | null
          id: string
          notes: string | null
          overtime_hours: number | null
          shift_id: string | null
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          shift_id?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          shift_id?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          app_type: Database["public"]["Enums"]["app_type"] | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          app_type?: Database["public"]["Enums"]["app_type"] | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          app_type?: Database["public"]["Enums"]["app_type"] | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      employees_public: {
        Row: {
          company_id: string | null
          created_at: string | null
          department_id: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          position: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          position?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          position?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_organization: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
      get_available_admins_for_user: {
        Args: { _user_id: string }
        Returns: {
          email: string
          full_name: string
          role: string
          user_id: string
        }[]
      }
      get_company_employee_names: {
        Args: { _company_id: string }
        Returns: {
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_company_employees_for_schedule: {
        Args: { _company_id: string }
        Returns: {
          company_id: string
          department_id: string
          employee_position: string
          employee_status: string
          first_name: string
          id: string
          last_name: string
          team_id: string
          user_id: string
        }[]
      }
      get_company_organization_id: {
        Args: { _company_id: string }
        Returns: string
      }
      get_employee_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_app_type: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_type"]
      }
      has_app_access: {
        Args: {
          _app_type: Database["public"]["Enums"]["app_type"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_manager_for_employee: {
        Args: { _employee_user_id: string; _manager_id: string }
        Returns: boolean
      }
      is_employee_at_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_creator: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
      is_organization_manager: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
      is_organization_manager_for_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_organization_manager_for_employee: {
        Args: { _employee_id: string; _user_id: string }
        Returns: boolean
      }
      is_organization_manager_for_shift: {
        Args: { _shift_id: string; _user_id: string }
        Returns: boolean
      }
      is_organization_manager_for_user: {
        Args: { _manager_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "user"
        | "admin"
        | "super_admin"
        | "operations_manager"
        | "manager"
        | "candidate"
        | "employee"
        | "house_keeping"
        | "maintenance"
      app_type: "calendar" | "scheduler"
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
      app_role: [
        "user",
        "admin",
        "super_admin",
        "operations_manager",
        "manager",
        "candidate",
        "employee",
        "house_keeping",
        "maintenance",
      ],
      app_type: ["calendar", "scheduler"],
    },
  },
} as const
