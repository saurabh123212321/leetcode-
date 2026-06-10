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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          tenant_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          created_by: string
          id: string
          role: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          created_by: string
          id?: string
          role: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          created_by?: string
          id?: string
          role?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string | null
          created_at: string
          created_by: string
          id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by: string
          id?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string
          id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_submissions: {
        Row: {
          code: string
          created_at: string
          created_by: string
          execution_time: number | null
          file_id: string | null
          id: string
          language: string
          memory_kb: number | null
          status: string | null
          stderr: string | null
          stdin: string | null
          stdout: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          execution_time?: number | null
          file_id?: string | null
          id?: string
          language: string
          memory_kb?: number | null
          status?: string | null
          stderr?: string | null
          stdin?: string | null
          stdout?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          execution_time?: number | null
          file_id?: string | null
          id?: string
          language?: string
          memory_kb?: number | null
          status?: string | null
          stderr?: string | null
          stdin?: string | null
          stdout?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_submissions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coding_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cw_questions: {
        Row: {
          acceptance: number | null
          companies: string[]
          company_count: number
          created_at: string
          difficulty: string
          frequency_max: number | null
          id: number
          slug: string
          title: string
          topics: string[]
          updated_at: string
          url: string
        }
        Insert: {
          acceptance?: number | null
          companies?: string[]
          company_count?: number
          created_at?: string
          difficulty: string
          frequency_max?: number | null
          id: number
          slug: string
          title: string
          topics?: string[]
          updated_at?: string
          url: string
        }
        Update: {
          acceptance?: number | null
          companies?: string[]
          company_count?: number
          created_at?: string
          difficulty?: string
          frequency_max?: number | null
          id?: number
          slug?: string
          title?: string
          topics?: string[]
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          color_tag: string | null
          content: string
          created_at: string
          created_by: string
          folder_id: string | null
          id: string
          language: string
          name: string
          tenant_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color_tag?: string | null
          content?: string
          created_at?: string
          created_by: string
          folder_id?: string | null
          id?: string
          language?: string
          name: string
          tenant_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color_tag?: string | null
          content?: string
          created_at?: string
          created_by?: string
          folder_id?: string | null
          id?: string
          language?: string
          name?: string
          tenant_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          color_tag: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          parent_id: string | null
          tenant_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color_tag?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          parent_id?: string | null
          tenant_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color_tag?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          parent_id?: string | null
          tenant_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leetcode_cache: {
        Row: {
          cache_key: string
          fetched_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          fetched_at?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          fetched_at?: string
          payload?: Json
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_ai_generated: boolean | null
          is_pinned: boolean | null
          summary: string | null
          tags: string[] | null
          tenant_id: string
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by: string
          id?: string
          is_ai_generated?: boolean | null
          is_pinned?: boolean | null
          summary?: string | null
          tags?: string[] | null
          tenant_id: string
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_ai_generated?: boolean | null
          is_pinned?: boolean | null
          summary?: string | null
          tags?: string[] | null
          tenant_id?: string
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          read: boolean
          recipient_id: string
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          read?: boolean
          recipient_id: string
          tenant_id: string
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          read?: boolean
          recipient_id?: string
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          answers: Json
          created_at: string
          duration_seconds: number
          ended_at: string | null
          file_ids: string[]
          id: string
          problem_ids: string[]
          started_at: string
          status: string
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          answers?: Json
          created_at?: string
          duration_seconds: number
          ended_at?: string | null
          file_ids?: string[]
          id?: string
          problem_ids?: string[]
          started_at?: string
          status?: string
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          answers?: Json
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          file_ids?: string[]
          id?: string
          problem_ids?: string[]
          started_at?: string
          status?: string
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      problem_submissions: {
        Row: {
          code: string
          created_at: string
          failure_detail: Json | null
          id: string
          language: string
          memory_kb: number | null
          passed_tests: number
          problem_id: string
          runtime_ms: number | null
          status: Database["public"]["Enums"]["submission_status"]
          tenant_id: string | null
          total_tests: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          failure_detail?: Json | null
          id?: string
          language: string
          memory_kb?: number | null
          passed_tests?: number
          problem_id: string
          runtime_ms?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          tenant_id?: string | null
          total_tests?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          failure_detail?: Json | null
          id?: string
          language?: string
          memory_kb?: number | null
          passed_tests?: number
          problem_id?: string
          runtime_ms?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          tenant_id?: string | null
          total_tests?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_submissions_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_tests: {
        Row: {
          created_at: string
          expected_stdout: string
          id: string
          is_sample: boolean
          ordinal: number
          problem_id: string
          stdin: string
        }
        Insert: {
          created_at?: string
          expected_stdout?: string
          id?: string
          is_sample?: boolean
          ordinal?: number
          problem_id: string
          stdin?: string
        }
        Update: {
          created_at?: string
          expected_stdout?: string
          id?: string
          is_sample?: boolean
          ordinal?: number
          problem_id?: string
          stdin?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_tests_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      problems: {
        Row: {
          constraints: string | null
          created_at: string
          created_by: string | null
          description: string
          difficulty: Database["public"]["Enums"]["problem_difficulty"]
          editorial: string | null
          examples: Json
          hints: string[]
          id: string
          is_published: boolean
          memory_limit_kb: number
          slug: string
          starter_code: Json
          tags: string[]
          time_limit_ms: number
          title: string
          updated_at: string
        }
        Insert: {
          constraints?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          difficulty?: Database["public"]["Enums"]["problem_difficulty"]
          editorial?: string | null
          examples?: Json
          hints?: string[]
          id?: string
          is_published?: boolean
          memory_limit_kb?: number
          slug: string
          starter_code?: Json
          tags?: string[]
          time_limit_ms?: number
          title: string
          updated_at?: string
        }
        Update: {
          constraints?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          difficulty?: Database["public"]["Enums"]["problem_difficulty"]
          editorial?: string | null
          examples?: Json
          hints?: string[]
          id?: string
          is_published?: boolean
          memory_limit_kb?: number
          slug?: string
          starter_code?: Json
          tags?: string[]
          time_limit_ms?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_seeded: boolean
          must_reset_password: boolean
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_seeded?: boolean
          must_reset_password?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_seeded?: boolean
          must_reset_password?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          created_at: string
          created_by: string
          id: string
          quiz_id: string
          score: number
          tenant_id: string
          time_taken_seconds: number | null
          total: number
          updated_at: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          created_by: string
          id?: string
          quiz_id: string
          score?: number
          tenant_id: string
          time_taken_seconds?: number | null
          total?: number
          updated_at?: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          quiz_id?: string
          score?: number
          tenant_id?: string
          time_taken_seconds?: number | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          difficulty: Database["public"]["Enums"]["quiz_difficulty"]
          id: string
          questions: Json
          tenant_id: string
          time_limit_minutes: number | null
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          id?: string
          questions?: Json
          tenant_id: string
          time_limit_minutes?: number | null
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          id?: string
          questions?: Json
          tenant_id?: string
          time_limit_minutes?: number | null
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          ai_tokens_used: number | null
          created_at: string
          created_by: string | null
          id: string
          monthly_revenue: number | null
          plan: Database["public"]["Enums"]["tenant_plan"]
          status: string
          storage_used_mb: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_tokens_used?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_revenue?: number | null
          plan?: Database["public"]["Enums"]["tenant_plan"]
          status?: string
          storage_used_mb?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ai_tokens_used?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_revenue?: number | null
          plan?: Database["public"]["Enums"]["tenant_plan"]
          status?: string
          storage_used_mb?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          body: string | null
          created_at: string
          created_by: string
          id: string
          priority: string
          status: string
          subject: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by: string
          id?: string
          priority?: string
          status?: string
          subject: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          plan: Database["public"]["Enums"]["tenant_plan"]
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: Database["public"]["Enums"]["tenant_plan"]
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: Database["public"]["Enums"]["tenant_plan"]
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_of_tenant: {
        Args: { _tenant: string; _user_id: string }
        Returns: boolean
      }
      is_mentor_of_tenant: {
        Args: { _tenant: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "mentor" | "student"
      notification_type:
        | "info"
        | "reminder"
        | "announcement"
        | "achievement"
        | "alert"
      problem_difficulty: "easy" | "medium" | "hard"
      quiz_difficulty: "beginner" | "intermediate" | "advanced"
      submission_status:
        | "pending"
        | "accepted"
        | "wrong_answer"
        | "runtime_error"
        | "compile_error"
        | "tle"
        | "mle"
      tenant_plan: "free" | "pro" | "organization"
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
      app_role: ["super_admin", "admin", "mentor", "student"],
      notification_type: [
        "info",
        "reminder",
        "announcement",
        "achievement",
        "alert",
      ],
      problem_difficulty: ["easy", "medium", "hard"],
      quiz_difficulty: ["beginner", "intermediate", "advanced"],
      submission_status: [
        "pending",
        "accepted",
        "wrong_answer",
        "runtime_error",
        "compile_error",
        "tle",
        "mle",
      ],
      tenant_plan: ["free", "pro", "organization"],
    },
  },
} as const
