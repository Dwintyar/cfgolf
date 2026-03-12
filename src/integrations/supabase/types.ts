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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      club_invitations: {
        Row: {
          club_id: string
          created_at: string
          id: string
          invited_by: string
          invited_email: string | null
          invited_user_id: string | null
          status: Database["public"]["Enums"]["invitation_status"]
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          invited_by: string
          invited_email?: string | null
          invited_user_id?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          invited_email?: string | null
          invited_user_id?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "club_invitations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_personal: boolean
          logo_url: string | null
          name: string
          owner_id: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_personal?: boolean
          logo_url?: string | null
          name: string
          owner_id?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_personal?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_holes: {
        Row: {
          course_id: string
          distance_yards: number | null
          handicap_index: number | null
          hole_number: number
          id: string
          par: number
        }
        Insert: {
          course_id: string
          distance_yards?: number | null
          handicap_index?: number | null
          hole_number: number
          id?: string
          par?: number
        }
        Update: {
          course_id?: string
          distance_yards?: number | null
          handicap_index?: number | null
          hole_number?: number
          id?: string
          par?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_holes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_tees: {
        Row: {
          color: string | null
          course_id: string
          created_at: string
          id: string
          rating: number | null
          slope: number | null
          tee_name: string
        }
        Insert: {
          color?: string | null
          course_id: string
          created_at?: string
          id?: string
          rating?: number | null
          slope?: number | null
          tee_name: string
        }
        Update: {
          color?: string | null
          course_id?: string
          created_at?: string
          id?: string
          rating?: number | null
          slope?: number | null
          tee_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_tees_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          club_id: string | null
          created_at: string
          description: string | null
          green_fee_price: number | null
          holes_count: number
          id: string
          image_url: string | null
          location: string | null
          name: string
          par: number | null
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          description?: string | null
          green_fee_price?: number | null
          holes_count?: number
          id?: string
          image_url?: string | null
          location?: string | null
          name: string
          par?: number | null
        }
        Update: {
          club_id?: string | null
          created_at?: string
          description?: string | null
          green_fee_price?: number | null
          holes_count?: number
          id?: string
          image_url?: string | null
          location?: string | null
          name?: string
          par?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      hole_scores: {
        Row: {
          created_at: string
          fairway_hit: boolean | null
          gir: boolean | null
          hole_number: number
          id: string
          putts: number | null
          scorecard_id: string
          strokes: number | null
        }
        Insert: {
          created_at?: string
          fairway_hit?: boolean | null
          gir?: boolean | null
          hole_number: number
          id?: string
          putts?: number | null
          scorecard_id: string
          strokes?: number | null
        }
        Update: {
          created_at?: string
          fairway_hit?: boolean | null
          gir?: boolean | null
          hole_number?: number
          id?: string
          putts?: number | null
          scorecard_id?: string
          strokes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hole_scores_scorecard_id_fkey"
            columns: ["scorecard_id"]
            isOneToOne: false
            referencedRelation: "scorecards"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          handicap: number | null
          id: string
          location: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          handicap?: number | null
          id: string
          location?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          handicap?: number | null
          id?: string
          location?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      round_players: {
        Row: {
          id: string
          round_id: string
          user_id: string
        }
        Insert: {
          id?: string
          round_id: string
          user_id: string
        }
        Update: {
          id?: string
          round_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_players_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          finished_at: string | null
          id: string
          started_at: string
          status: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by: string
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecards: {
        Row: {
          course_id: string | null
          created_at: string
          gross_score: number | null
          id: string
          net_score: number | null
          player_id: string
          round_id: string
          total_putts: number | null
          total_score: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          gross_score?: number | null
          id?: string
          net_score?: number | null
          player_id: string
          round_id: string
          total_putts?: number | null
          total_score?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          gross_score?: number | null
          id?: string
          net_score?: number | null
          player_id?: string
          round_id?: string
          total_putts?: number | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecards_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecards_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      invitation_status: "pending" | "accepted" | "declined"
      member_role: "owner" | "admin" | "member"
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
      invitation_status: ["pending", "accepted", "declined"],
      member_role: ["owner", "admin", "member"],
    },
  },
} as const
