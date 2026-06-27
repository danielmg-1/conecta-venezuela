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
      aid_point_contacts: {
        Row: {
          aid_point_id: string
          created_at: string
          id: string
          kind: string
          label: string | null
          value: string
        }
        Insert: {
          aid_point_id: string
          created_at?: string
          id?: string
          kind: string
          label?: string | null
          value: string
        }
        Update: {
          aid_point_id?: string
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "aid_point_contacts_aid_point_id_fkey"
            columns: ["aid_point_id"]
            isOneToOne: false
            referencedRelation: "aid_points"
            referencedColumns: ["id"]
          },
        ]
      }
      aid_point_hosts: {
        Row: {
          aid_point_id: string
          id: string
          invited_at: string
          invited_by: string | null
          responded_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          aid_point_id: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          responded_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          aid_point_id?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          responded_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aid_point_hosts_aid_point_id_fkey"
            columns: ["aid_point_id"]
            isOneToOne: false
            referencedRelation: "aid_points"
            referencedColumns: ["id"]
          },
        ]
      }
      aid_point_needs: {
        Row: {
          aid_point_id: string
          created_at: string
          created_by: string | null
          details: string | null
          fulfilled: boolean
          fulfilled_at: string | null
          fulfilled_by: string | null
          id: string
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          aid_point_id: string
          created_at?: string
          created_by?: string | null
          details?: string | null
          fulfilled?: boolean
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          aid_point_id?: string
          created_at?: string
          created_by?: string | null
          details?: string | null
          fulfilled?: boolean
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aid_point_needs_aid_point_id_fkey"
            columns: ["aid_point_id"]
            isOneToOne: false
            referencedRelation: "aid_points"
            referencedColumns: ["id"]
          },
        ]
      }
      aid_points: {
        Row: {
          ciudad: string | null
          created_at: string
          descripcion: string | null
          direccion: string | null
          estado: string
          hidden_by_admin: boolean
          horario: string | null
          id: string
          lat: number | null
          lng: number | null
          necesidades: string | null
          nombre: string
          owner_id: string
          photo_path: string | null
          telefono: string | null
          tipo: Database["public"]["Enums"]["aid_point_type"]
          updated_at: string
        }
        Insert: {
          ciudad?: string | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          estado: string
          hidden_by_admin?: boolean
          horario?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          necesidades?: string | null
          nombre: string
          owner_id: string
          photo_path?: string | null
          telefono?: string | null
          tipo: Database["public"]["Enums"]["aid_point_type"]
          updated_at?: string
        }
        Update: {
          ciudad?: string | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          estado?: string
          hidden_by_admin?: boolean
          horario?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          necesidades?: string | null
          nombre?: string
          owner_id?: string
          photo_path?: string | null
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["aid_point_type"]
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          pages: string[]
          starts_at: string | null
          title: string
          updated_at: string
          variant: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          pages?: string[]
          starts_at?: string | null
          title: string
          updated_at?: string
          variant?: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          pages?: string[]
          starts_at?: string | null
          title?: string
          updated_at?: string
          variant?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts: Json
          role: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          categoria: string
          created_at: string
          descripcion: string | null
          id: string
          nombre_institucion: string
          orden: number
          telefono: string
        }
        Insert: {
          categoria: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre_institucion: string
          orden?: number
          telefono: string
        }
        Update: {
          categoria?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre_institucion?: string
          orden?: number
          telefono?: string
        }
        Relationships: []
      }
      missing_person_audit: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          changes: Json
          created_at: string
          id: string
          person_id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          changes?: Json
          created_at?: string
          id?: string
          person_id: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          changes?: Json
          created_at?: string
          id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missing_person_audit_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "missing_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      missing_person_contacts: {
        Row: {
          codigo_pais: string | null
          created_at: string
          id: string
          person_id: string
          tipo: Database["public"]["Enums"]["contact_type"]
          valor: string
        }
        Insert: {
          codigo_pais?: string | null
          created_at?: string
          id?: string
          person_id: string
          tipo: Database["public"]["Enums"]["contact_type"]
          valor: string
        }
        Update: {
          codigo_pais?: string | null
          created_at?: string
          id?: string
          person_id?: string
          tipo?: Database["public"]["Enums"]["contact_type"]
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "missing_person_contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "missing_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      missing_persons: {
        Row: {
          birth_date: string | null
          cedula: string | null
          ciudad: string | null
          consent_at: string | null
          created_at: string
          descripcion: string | null
          estado: string
          full_name: string
          hidden_by_admin: boolean
          id: string
          lat: number | null
          lng: number | null
          lugar_desaparicion: string | null
          photo_path: string | null
          public_consent: boolean
          reporter_id: string
          status: Database["public"]["Enums"]["missing_status"]
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          cedula?: string | null
          ciudad?: string | null
          consent_at?: string | null
          created_at?: string
          descripcion?: string | null
          estado: string
          full_name: string
          hidden_by_admin?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          lugar_desaparicion?: string | null
          photo_path?: string | null
          public_consent?: boolean
          reporter_id: string
          status?: Database["public"]["Enums"]["missing_status"]
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          cedula?: string | null
          ciudad?: string | null
          consent_at?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: string
          full_name?: string
          hidden_by_admin?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          lugar_desaparicion?: string | null
          photo_path?: string | null
          public_consent?: boolean
          reporter_id?: string
          status?: Database["public"]["Enums"]["missing_status"]
          updated_at?: string
        }
        Relationships: []
      }
      moderator_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          section: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          section: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          section?: string
          user_id?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          author_id: string
          body_html: string | null
          contenido: string
          created_at: string
          id: string
          is_html: boolean
          photo_path: string | null
          published: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body_html?: string | null
          contenido: string
          created_at?: string
          id?: string
          is_html?: boolean
          photo_path?: string | null
          published?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body_html?: string | null
          contenido?: string
          created_at?: string
          id?: string
          is_html?: boolean
          photo_path?: string | null
          published?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tips: {
        Row: {
          autor_contacto: string | null
          autor_nombre: string
          created_at: string
          id: string
          mensaje: string
          person_id: string
        }
        Insert: {
          autor_contacto?: string | null
          autor_nombre: string
          created_at?: string
          id?: string
          mensaje: string
          person_id: string
        }
        Update: {
          autor_contacto?: string | null
          autor_nombre?: string
          created_at?: string
          id?: string
          mensaje?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "missing_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      volunteers: {
        Row: {
          ciudad: string | null
          contacto: string
          created_at: string
          descripcion: string | null
          disponibilidad: string | null
          estado: string
          habilidades: string | null
          hidden_by_admin: boolean
          id: string
          nombre: string
          profesion: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ciudad?: string | null
          contacto: string
          created_at?: string
          descripcion?: string | null
          disponibilidad?: string | null
          estado: string
          habilidades?: string | null
          hidden_by_admin?: boolean
          id?: string
          nombre: string
          profesion: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ciudad?: string | null
          contacto?: string
          created_at?: string
          descripcion?: string | null
          disponibilidad?: string | null
          estado?: string
          habilidades?: string | null
          hidden_by_admin?: boolean
          id?: string
          nombre?: string
          profesion?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_grant_role_by_email: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: Json
      }
      admin_list_moderators_with_permissions: {
        Args: never
        Returns: {
          email: string
          full_name: string
          granted_at: string
          sections: string[]
          user_id: string
        }[]
      }
      admin_list_users_by_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: {
          email: string
          full_name: string
          granted_at: string
          user_id: string
        }[]
      }
      admin_revoke_role_by_email: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: Json
      }
      admin_set_moderator_permissions: {
        Args: { _email: string; _sections: string[] }
        Returns: Json
      }
      aid_point_add_host_by_email: {
        Args: { _aid_point_id: string; _email: string }
        Returns: Json
      }
      aid_point_list_hosts: {
        Args: { _aid_point_id: string }
        Returns: {
          email: string
          full_name: string
          invited_at: string
          responded_at: string
          status: string
          user_id: string
        }[]
      }
      aid_point_list_my_invitations: {
        Args: never
        Returns: {
          aid_point_id: string
          ciudad: string
          estado: string
          invited_at: string
          nombre: string
          status: string
          tipo: string
        }[]
      }
      aid_point_remove_host: {
        Args: { _aid_point_id: string; _user_id: string }
        Returns: undefined
      }
      aid_point_respond_invitation: {
        Args: { _accept: boolean; _aid_point_id: string }
        Returns: undefined
      }
      can_manage_aid_point: {
        Args: { _aid_point_id: string; _user_id: string }
        Returns: boolean
      }
      has_moderator_permission: {
        Args: { _section: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      aid_point_type:
        | "centro_acopio"
        | "punto_recaudacion"
        | "hospital"
        | "clinica"
        | "primeros_auxilios"
        | "apoyo_psicologico"
        | "otro"
      app_role: "admin" | "user" | "moderator"
      contact_type: "telefono" | "whatsapp" | "email" | "instagram" | "otro"
      missing_status: "desaparecido" | "en_busqueda" | "encontrado"
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
      aid_point_type: [
        "centro_acopio",
        "punto_recaudacion",
        "hospital",
        "clinica",
        "primeros_auxilios",
        "apoyo_psicologico",
        "otro",
      ],
      app_role: ["admin", "user", "moderator"],
      contact_type: ["telefono", "whatsapp", "email", "instagram", "otro"],
      missing_status: ["desaparecido", "en_busqueda", "encontrado"],
    },
  },
} as const
