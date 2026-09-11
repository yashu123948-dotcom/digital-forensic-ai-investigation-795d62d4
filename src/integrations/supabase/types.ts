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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agent_outputs: {
        Row: {
          agent_key: string
          agent_name: string
          case_id: string
          confidence: number
          created_at: string
          evidence_refs: Json
          findings: Json
          id: string
          reasoning: string | null
          recommendations: Json
          risk: Database["public"]["Enums"]["risk_level"] | null
          sequence: number
          status: string
          summary: string | null
          user_id: string
        }
        Insert: {
          agent_key: string
          agent_name: string
          case_id: string
          confidence?: number
          created_at?: string
          evidence_refs?: Json
          findings?: Json
          id?: string
          reasoning?: string | null
          recommendations?: Json
          risk?: Database["public"]["Enums"]["risk_level"] | null
          sequence?: number
          status?: string
          summary?: string | null
          user_id: string
        }
        Update: {
          agent_key?: string
          agent_name?: string
          case_id?: string
          confidence?: number
          created_at?: string
          evidence_refs?: Json
          findings?: Json
          id?: string
          reasoning?: string | null
          recommendations?: Json
          risk?: Database["public"]["Enums"]["risk_level"] | null
          sequence?: number
          status?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_outputs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          created_at: string
          detail: string | null
          entity: string | null
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          created_at?: string
          detail?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          created_at?: string
          detail?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cases: {
        Row: {
          bookmarked: boolean
          case_type: string
          completed_at: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          malware_detected: number
          risk: Database["public"]["Enums"]["risk_level"] | null
          status: Database["public"]["Enums"]["case_status"]
          tags: string[]
          threat_score: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bookmarked?: boolean
          case_type?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          malware_detected?: number
          risk?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["case_status"]
          tags?: string[]
          threat_score?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bookmarked?: boolean
          case_type?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          malware_detected?: number
          risk?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["case_status"]
          tags?: string[]
          threat_score?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      evidence_files: {
        Row: {
          case_id: string
          created_at: string
          extracted_text: string | null
          file_name: string
          file_size: number
          file_type: string | null
          id: string
          sha256: string | null
          storage_path: string | null
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          extracted_text?: string | null
          file_name: string
          file_size?: number
          file_type?: string | null
          id?: string
          sha256?: string | null
          storage_path?: string | null
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          extracted_text?: string | null
          file_name?: string
          file_size?: number
          file_type?: string | null
          id?: string
          sha256?: string | null
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_files_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          organization: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          organization?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          organization?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          approval_note: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          case_id: string
          content: Json
          created_at: string
          executive_summary: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          approval_note?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          case_id: string
          content?: Json
          created_at?: string
          executive_summary?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          approval_note?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          case_id?: string
          content?: Json
          created_at?: string
          executive_summary?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_status: "pending" | "approved" | "rejected" | "deactivated"
      app_role: "admin" | "analyst"
      case_status: "draft" | "running" | "completed" | "failed"
      risk_level: "low" | "medium" | "high" | "critical"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_status: ["pending", "approved", "rejected", "deactivated"],
      app_role: ["admin", "analyst"],
      case_status: ["draft", "running", "completed", "failed"],
      risk_level: ["low", "medium", "high", "critical"],
    },
  },
} as const
