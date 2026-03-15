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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buddy_connections: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buddy_connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buddy_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      caddy_assignments: {
        Row: {
          caddy_id: string
          contestant_id: string
          created_at: string
          event_id: string
          id: string
        }
        Insert: {
          caddy_id: string
          contestant_id: string
          created_at?: string
          event_id: string
          id?: string
        }
        Update: {
          caddy_id?: string
          contestant_id?: string
          created_at?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caddy_assignments_caddy_id_fkey"
            columns: ["caddy_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caddy_assignments_contestant_id_fkey"
            columns: ["contestant_id"]
            isOneToOne: false
            referencedRelation: "contestants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caddy_assignments_contestant_id_fkey"
            columns: ["contestant_id"]
            isOneToOne: false
            referencedRelation: "event_leaderboard"
            referencedColumns: ["contestant_id"]
          },
          {
            foreignKeyName: "caddy_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_announcements: {
        Row: {
          author_id: string
          club_id: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          club_id: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          club_id?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_announcements_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
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
      club_staff: {
        Row: {
          club_id: string
          created_at: string
          id: string
          staff_role: string
          status: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          staff_role?: string
          status?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          staff_role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_staff_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          facility_type: string
          id: string
          is_personal: boolean
          is_verified: boolean
          logo_url: string | null
          name: string
          owner_id: string | null
          succession_user_id: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          facility_type?: string
          id?: string
          is_personal?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name: string
          owner_id?: string | null
          succession_user_id?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          facility_type?: string
          id?: string
          is_personal?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          succession_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_succession_user_id_fkey"
            columns: ["succession_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contestants: {
        Row: {
          created_at: string
          event_id: string
          flight_id: string | null
          hcp: number | null
          id: string
          player_id: string
          status: string
          ticket_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          flight_id?: string | null
          hcp?: number | null
          id?: string
          player_id: string
          status?: string
          ticket_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          flight_id?: string | null
          hcp?: number | null
          id?: string
          player_id?: string
          status?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contestants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contestants_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "tournament_flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contestants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contestants_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
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
          course_rating: number | null
          course_type: string
          created_at: string
          description: string | null
          green_fee_price: number | null
          holes_count: number
          id: string
          image_url: string | null
          location: string | null
          name: string
          par: number | null
          slope_rating: number | null
        }
        Insert: {
          club_id?: string | null
          course_rating?: number | null
          course_type?: string
          created_at?: string
          description?: string | null
          green_fee_price?: number | null
          holes_count?: number
          id?: string
          image_url?: string | null
          location?: string | null
          name: string
          par?: number | null
          slope_rating?: number | null
        }
        Update: {
          club_id?: string | null
          course_rating?: number | null
          course_type?: string
          created_at?: string
          description?: string | null
          green_fee_price?: number | null
          holes_count?: number
          id?: string
          image_url?: string | null
          location?: string | null
          name?: string
          par?: number | null
          slope_rating?: number | null
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
      event_checkins: {
        Row: {
          bag_drop_number: number | null
          checked_in_at: string
          contestant_id: string
          event_id: string
          id: string
          locker_number: number | null
          notes: string | null
        }
        Insert: {
          bag_drop_number?: number | null
          checked_in_at?: string
          contestant_id: string
          event_id: string
          id?: string
          locker_number?: number | null
          notes?: string | null
        }
        Update: {
          bag_drop_number?: number | null
          checked_in_at?: string
          contestant_id?: string
          event_id?: string
          id?: string
          locker_number?: number | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_checkins_contestant_id_fkey"
            columns: ["contestant_id"]
            isOneToOne: false
            referencedRelation: "contestants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checkins_contestant_id_fkey"
            columns: ["contestant_id"]
            isOneToOne: false
            referencedRelation: "event_leaderboard"
            referencedColumns: ["contestant_id"]
          },
          {
            foreignKeyName: "event_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_results: {
        Row: {
          category_id: string
          contestant_id: string
          created_at: string
          event_id: string
          id: string
          rank_position: number
          score_value: number
        }
        Insert: {
          category_id: string
          contestant_id: string
          created_at?: string
          event_id: string
          id?: string
          rank_position: number
          score_value: number
        }
        Update: {
          category_id?: string
          contestant_id?: string
          created_at?: string
          event_id?: string
          id?: string
          rank_position?: number
          score_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_results_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_winner_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_results_contestant_id_fkey"
            columns: ["contestant_id"]
            isOneToOne: false
            referencedRelation: "contestants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_results_contestant_id_fkey"
            columns: ["contestant_id"]
            isOneToOne: false
            referencedRelation: "event_leaderboard"
            referencedColumns: ["contestant_id"]
          },
          {
            foreignKeyName: "event_results_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          event_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          event_date: string
          id: string
          name: string
          status: string
          ticket_total: number
          tour_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          event_date: string
          id?: string
          name: string
          status?: string
          ticket_total?: number
          tour_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          id?: string
          name?: string
          status?: string
          ticket_total?: number
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      golf_cart_assignments: {
        Row: {
          cart_number: number
          contestant_id: string
          created_at: string
          event_id: string
          id: string
        }
        Insert: {
          cart_number: number
          contestant_id: string
          created_at?: string
          event_id: string
          id?: string
        }
        Update: {
          cart_number?: number
          contestant_id?: string
          created_at?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "golf_cart_assignments_contestant_id_fkey"
            columns: ["contestant_id"]
            isOneToOne: false
            referencedRelation: "contestants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "golf_cart_assignments_contestant_id_fkey"
            columns: ["contestant_id"]
            isOneToOne: false
            referencedRelation: "event_leaderboard"
            referencedColumns: ["contestant_id"]
          },
          {
            foreignKeyName: "golf_cart_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      handicap_history: {
        Row: {
          created_at: string
          event_id: string
          gross_score: number | null
          id: string
          net_score: number | null
          new_hcp: number | null
          old_hcp: number | null
          player_id: string
          sandbagging_flag: boolean
          tour_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          gross_score?: number | null
          id?: string
          net_score?: number | null
          new_hcp?: number | null
          old_hcp?: number | null
          player_id: string
          sandbagging_flag?: boolean
          tour_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          gross_score?: number | null
          id?: string
          net_score?: number | null
          new_hcp?: number | null
          old_hcp?: number | null
          player_id?: string
          sandbagging_flag?: boolean
          tour_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handicap_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handicap_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handicap_history_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
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
      pairing_players: {
        Row: {
          cart_number: number | null
          contestant_id: string | null
          created_at: string | null
          id: string
          pairing_id: string | null
          position: number | null
        }
        Insert: {
          cart_number?: number | null
          contestant_id?: string | null
          created_at?: string | null
          id?: string
          pairing_id?: string | null
          position?: number | null
        }
        Update: {
          cart_number?: number | null
          contestant_id?: string | null
          created_at?: string | null
          id?: string
          pairing_id?: string | null
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pairing_players_contestant_id_fkey"
            columns: ["contestant_id"]
            isOneToOne: false
            referencedRelation: "contestants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_players_contestant_id_fkey"
            columns: ["contestant_id"]
            isOneToOne: false
            referencedRelation: "event_leaderboard"
            referencedColumns: ["contestant_id"]
          },
          {
            foreignKeyName: "pairing_players_pairing_id_fkey"
            columns: ["pairing_id"]
            isOneToOne: false
            referencedRelation: "pairings"
            referencedColumns: ["id"]
          },
        ]
      }
      pairings: {
        Row: {
          created_at: string | null
          event_id: string | null
          flight_id: string | null
          group_number: number | null
          id: string
          start_hole: number | null
          start_type: string
          tee_time: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          flight_id?: string | null
          group_number?: number | null
          id?: string
          start_hole?: number | null
          start_type?: string
          tee_time?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          flight_id?: string | null
          group_number?: number | null
          id?: string
          start_hole?: number | null
          start_type?: string
          tee_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pairings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          category: string
          comments_count: number
          content: string
          course_id: string | null
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string
          comments_count?: number
          content: string
          course_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          comments_count?: number
          content?: string
          course_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
      range_bays: {
        Row: {
          bay_number: number
          bay_type: string
          club_id: string
          created_at: string
          id: string
          is_active: boolean
          price_per_hour: number
        }
        Insert: {
          bay_number: number
          bay_type?: string
          club_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          price_per_hour?: number
        }
        Update: {
          bay_number?: number
          bay_type?: string
          club_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          price_per_hour?: number
        }
        Relationships: [
          {
            foreignKeyName: "range_bays_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      range_bookings: {
        Row: {
          balls_bucket_count: number | null
          bay_id: string
          booking_date: string
          club_id: string
          created_at: string
          duration_hours: number
          end_time: string
          id: string
          notes: string | null
          start_time: string
          status: string
          total_price: number
          user_id: string
        }
        Insert: {
          balls_bucket_count?: number | null
          bay_id: string
          booking_date: string
          club_id: string
          created_at?: string
          duration_hours?: number
          end_time: string
          id?: string
          notes?: string | null
          start_time: string
          status?: string
          total_price: number
          user_id: string
        }
        Update: {
          balls_bucket_count?: number | null
          bay_id?: string
          booking_date?: string
          club_id?: string
          created_at?: string
          duration_hours?: number
          end_time?: string
          id?: string
          notes?: string | null
          start_time?: string
          status?: string
          total_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "range_bookings_bay_id_fkey"
            columns: ["bay_id"]
            isOneToOne: false
            referencedRelation: "range_bays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "range_bookings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "range_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      range_lessons: {
        Row: {
          club_id: string
          created_at: string
          duration_minutes: number
          id: string
          instructor_id: string
          lesson_date: string
          lesson_type: string
          notes: string | null
          price: number
          start_time: string
          status: string
          student_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          instructor_id: string
          lesson_date: string
          lesson_type?: string
          notes?: string | null
          price?: number
          start_time: string
          status?: string
          student_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          instructor_id?: string
          lesson_date?: string
          lesson_type?: string
          notes?: string | null
          price?: number
          start_time?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "range_lessons_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "range_lessons_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "range_lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      system_admins: {
        Row: {
          admin_level: string
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          user_id: string
        }
        Insert: {
          admin_level?: string
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          user_id: string
        }
        Update: {
          admin_level?: string
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_admins_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tee_time_bookings: {
        Row: {
          booking_date: string
          course_id: string
          created_at: string
          id: string
          notes: string | null
          players_count: number
          status: string
          tee_time: string
          total_price: number | null
          user_id: string
        }
        Insert: {
          booking_date: string
          course_id: string
          created_at?: string
          id?: string
          notes?: string | null
          players_count?: number
          status?: string
          tee_time: string
          total_price?: number | null
          user_id: string
        }
        Update: {
          booking_date?: string
          course_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          players_count?: number
          status?: string
          tee_time?: string
          total_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tee_time_bookings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tee_time_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_player_id: string | null
          club_id: string
          created_at: string
          event_id: string
          id: string
          status: string
          ticket_number: number
        }
        Insert: {
          assigned_player_id?: string | null
          club_id: string
          created_at?: string
          event_id: string
          id?: string
          status?: string
          ticket_number: number
        }
        Update: {
          assigned_player_id?: string | null
          club_id?: string
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          ticket_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_player_id_fkey"
            columns: ["assigned_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_clubs: {
        Row: {
          club_id: string
          created_at: string
          id: string
          status: string
          ticket_quota: number
          tour_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          status?: string
          ticket_quota?: number
          tour_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          status?: string
          ticket_quota?: number
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_clubs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_clubs_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_players: {
        Row: {
          club_id: string
          created_at: string
          hcp_at_registration: number | null
          hcp_tour: number | null
          id: string
          player_id: string
          status: string
          tour_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          hcp_at_registration?: number | null
          hcp_tour?: number | null
          id?: string
          player_id: string
          status?: string
          tour_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          hcp_at_registration?: number | null
          hcp_tour?: number | null
          id?: string
          player_id?: string
          status?: string
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_players_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_flights: {
        Row: {
          created_at: string
          display_order: number
          flight_name: string
          hcp_max: number
          hcp_min: number
          id: string
          tour_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          flight_name: string
          hcp_max?: number
          hcp_min?: number
          id?: string
          tour_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          flight_name?: string
          hcp_max?: number
          hcp_min?: number
          id?: string
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_flights_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_winner_categories: {
        Row: {
          calculation_type: string
          category_name: string
          created_at: string
          display_order: number
          flight_id: string | null
          id: string
          rank_count: number
          tour_id: string
        }
        Insert: {
          calculation_type?: string
          category_name: string
          created_at?: string
          display_order?: number
          flight_id?: string | null
          id?: string
          rank_count?: number
          tour_id: string
        }
        Update: {
          calculation_type?: string
          category_name?: string
          created_at?: string
          display_order?: number
          flight_id?: string | null
          id?: string
          rank_count?: number
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_winner_categories_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "tournament_flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_winner_categories_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organizer_club_id: string
          tournament_type: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organizer_club_id: string
          tournament_type?: string
          year?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organizer_club_id?: string
          tournament_type?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tours_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_organizer_club_id_fkey"
            columns: ["organizer_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      event_leaderboard: {
        Row: {
          contestant_id: string | null
          event_id: string | null
          flight_id: string | null
          hcp: number | null
          player_id: string | null
          rank_gross: number | null
          rank_net: number | null
          status: string | null
          total_gross: number | null
          total_net: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contestants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contestants_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "tournament_flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contestants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_handicap_trend: {
        Row: {
          created_at: string | null
          event_id: string | null
          gross_score: number | null
          net_score: number | null
          new_hcp: number | null
          old_hcp: number | null
          player_id: string | null
          sandbagging_flag: boolean | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          gross_score?: number | null
          net_score?: number | null
          new_hcp?: number | null
          old_hcp?: number | null
          player_id?: string | null
          sandbagging_flag?: boolean | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          gross_score?: number | null
          net_score?: number | null
          new_hcp?: number | null
          old_hcp?: number | null
          player_id?: string | null
          sandbagging_flag?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "handicap_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handicap_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_admin_level: { Args: { check_user_id?: string }; Returns: string }
      get_my_conversation_ids: { Args: never; Returns: string[] }
      is_club_admin: {
        Args: { check_club_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { check_user_id?: string }; Returns: boolean }
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
