export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      charities: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          is_featured: boolean;
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_featured?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_featured?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      charity_events: {
        Row: {
          charity_id: string;
          created_at: string;
          description: string | null;
          event_date: string;
          id: string;
          location: string | null;
          title: string;
        };
        Insert: {
          charity_id: string;
          created_at?: string;
          description?: string | null;
          event_date: string;
          id?: string;
          location?: string | null;
          title: string;
        };
        Update: {
          charity_id?: string;
          created_at?: string;
          description?: string | null;
          event_date?: string;
          id?: string;
          location?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "charity_events_charity_id_fkey";
            columns: ["charity_id"];
            isOneToOne: false;
            referencedRelation: "charities";
            referencedColumns: ["id"];
          },
        ];
      };
      donations: {
        Row: {
          amount_cents: number;
          charity_id: string;
          created_at: string;
          id: string;
          note: string | null;
          user_id: string;
        };
        Insert: {
          amount_cents: number;
          charity_id: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          user_id: string;
        };
        Update: {
          amount_cents?: number;
          charity_id?: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "donations_charity_id_fkey";
            columns: ["charity_id"];
            isOneToOne: false;
            referencedRelation: "charities";
            referencedColumns: ["id"];
          },
        ];
      };
      draws: {
        Row: {
          created_at: string;
          description: string | null;
          draw_month: string;
          id: string;
          kind: Database["public"]["Enums"]["draw_kind"];
          prize_pool_cents: number;
          rollover_cents: number;
          status: Database["public"]["Enums"]["draw_status"];
          target_numbers: number[];
          target_score: number | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          draw_month: string;
          id?: string;
          kind?: Database["public"]["Enums"]["draw_kind"];
          prize_pool_cents?: number;
          rollover_cents?: number;
          status?: Database["public"]["Enums"]["draw_status"];
          target_numbers?: number[];
          target_score?: number | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          draw_month?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["draw_kind"];
          prize_pool_cents?: number;
          rollover_cents?: number;
          status?: Database["public"]["Enums"]["draw_status"];
          target_numbers?: number[];
          target_score?: number | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          contribution_percent: number;
          created_at: string;
          display_name: string | null;
          id: string;
          selected_charity_id: string | null;
          updated_at: string;
        };
        Insert: {
          contribution_percent?: number;
          created_at?: string;
          display_name?: string | null;
          id: string;
          selected_charity_id?: string | null;
          updated_at?: string;
        };
        Update: {
          contribution_percent?: number;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          selected_charity_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_selected_charity_id_fkey";
            columns: ["selected_charity_id"];
            isOneToOne: false;
            referencedRelation: "charities";
            referencedColumns: ["id"];
          },
        ];
      };
      scores: {
        Row: {
          created_at: string;
          id: string;
          played_on: string;
          score: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          played_on: string;
          score: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          played_on?: string;
          score?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          id: string;
          plan: Database["public"]["Enums"]["subscription_plan"] | null;
          status: Database["public"]["Enums"]["subscription_status"];
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan?: Database["public"]["Enums"]["subscription_plan"] | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan?: Database["public"]["Enums"]["subscription_plan"] | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      winners: {
        Row: {
          admin_notes: string | null;
          created_at: string;
          draw_id: string;
          id: string;
          matched_count: number | null;
          payout: Database["public"]["Enums"]["payout_status"];
          prize_cents: number;
          proof_path: string | null;
          tier: Database["public"]["Enums"]["winner_tier"] | null;
          updated_at: string;
          user_id: string;
          verification: Database["public"]["Enums"]["verification_status"];
        };
        Insert: {
          admin_notes?: string | null;
          created_at?: string;
          draw_id: string;
          id?: string;
          matched_count?: number | null;
          payout?: Database["public"]["Enums"]["payout_status"];
          prize_cents?: number;
          proof_path?: string | null;
          tier?: Database["public"]["Enums"]["winner_tier"] | null;
          updated_at?: string;
          user_id: string;
          verification?: Database["public"]["Enums"]["verification_status"];
        };
        Update: {
          admin_notes?: string | null;
          created_at?: string;
          draw_id?: string;
          id?: string;
          matched_count?: number | null;
          payout?: Database["public"]["Enums"]["payout_status"];
          prize_cents?: number;
          proof_path?: string | null;
          tier?: Database["public"]["Enums"]["winner_tier"] | null;
          updated_at?: string;
          user_id?: string;
          verification?: Database["public"]["Enums"]["verification_status"];
        };
        Relationships: [
          {
            foreignKeyName: "winners_draw_id_fkey";
            columns: ["draw_id"];
            isOneToOne: false;
            referencedRelation: "draws";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "subscriber";
      draw_kind: "random" | "weighted_frequent" | "weighted_infrequent";
      draw_status: "draft" | "open" | "closed" | "published";
      payout_status: "pending" | "paid";
      subscription_plan: "monthly" | "yearly";
      subscription_status:
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "paused";
      verification_status: "pending" | "approved" | "rejected";
      winner_tier: "match5" | "match4" | "match3";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "subscriber"],
      draw_kind: ["random", "weighted_frequent", "weighted_infrequent"],
      draw_status: ["draft", "open", "closed", "published"],
      payout_status: ["pending", "paid"],
      subscription_plan: ["monthly", "yearly"],
      subscription_status: [
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "paused",
      ],
      verification_status: ["pending", "approved", "rejected"],
      winner_tier: ["match5", "match4", "match3"],
    },
  },
} as const;
