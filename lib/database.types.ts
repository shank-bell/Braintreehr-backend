// Database type for @supabase/supabase-js's generic client parameter.
// Normally generated via `supabase gen types typescript` against a live
// project; hand-written here to match supabase/migrations/*.sql exactly,
// since the schema is fully authored in this repo, not introspected.
// If a migration changes a column, update this file in the same commit.

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          slug: string;
          title: string;
          department: string;
          location: string;
          employment_type: string;
          pay_range: string | null;
          description: string;
          requirements: string | null;
          status: string;
          posted_at: string | null;
          created_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          department: string;
          location: string;
          employment_type: string;
          pay_range?: string | null;
          description: string;
          requirements?: string | null;
          status?: string;
          posted_at?: string | null;
          created_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["jobs"]["Insert"]>;
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          job_id: string | null;
          role_applied: string;
          full_name: string;
          email: string;
          phone: string;
          location: string | null;
          current_company: string | null;
          years_experience: string | null;
          linkedin_url: string | null;
          notice_period: string | null;
          resume_path: string;
          resume_filename: string;
          cover_note: string | null;
          status: string;
          ip_hash: string;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          job_id?: string | null;
          role_applied: string;
          full_name: string;
          email: string;
          phone: string;
          location?: string | null;
          current_company?: string | null;
          years_experience?: string | null;
          linkedin_url?: string | null;
          notice_period?: string | null;
          resume_path: string;
          resume_filename: string;
          cover_note?: string | null;
          status?: string;
          ip_hash: string;
          submitted_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["applications"]["Insert"]>;
        Relationships: [];
      };
      contact_submissions: {
        Row: {
          id: string;
          name: string;
          email: string;
          company: string | null;
          topic: string;
          budget_band: string | null;
          message: string | null;
          status: string;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          company?: string | null;
          topic: string;
          budget_band?: string | null;
          message?: string | null;
          status?: string;
          submitted_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contact_submissions"]["Insert"]>;
        Relationships: [];
      };
      staff_profiles: {
        Row: {
          id: string;
          full_name: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_profiles"]["Insert"]>;
        Relationships: [];
      };
      rate_limit_hits: {
        Row: {
          ip_hash: string;
          route: string;
          window_start: string;
          count: number;
        };
        Insert: {
          ip_hash: string;
          route: string;
          window_start: string;
          count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["rate_limit_hits"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      increment_rate_limit: {
        Args: {
          p_ip_hash: string;
          p_route: string;
          p_window_start: string;
        };
        Returns: number;
      };
    };
  };
}
