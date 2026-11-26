export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      teachers: {
        Row: {
          id: string;
          name: string;
          email_id: string;
          mobile_number: string;
          gender: string;
          password: string;
          auth_user_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          name: string;
          email_id: string;
          mobile_number: string;
          gender: string;
          password: string;
          auth_user_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email_id?: string;
          mobile_number?: string;
          gender?: string;
          password?: string;
          auth_user_id?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          name: string;
          email_id: string;
          mobile_number: string;
          age: number;
          gender: string;
          auth_user_id: string | null;
          active_face_template_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          name: string;
          email_id: string;
          mobile_number: string;
          age: number;
          gender: string;
          auth_user_id?: string | null;
          active_face_template_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email_id?: string;
          mobile_number?: string;
          age?: number;
          gender?: string;
          auth_user_id?: string | null;
          active_face_template_id?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "students_active_face_template_id_fkey";
            columns: ["active_face_template_id"];
            isOneToOne: false;
            referencedRelation: "student_face_templates";
            referencedColumns: ["id"];
          }
        ];
      };
      student_face_templates: {
        Row: {
          id: string;
          student_id: string;
          model_id: string;
          model_version: string;
          preprocessing_version: string;
          embedding_dimension: number;
          vector: Json;
          is_active: boolean;
          consent_granted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          model_id: string;
          model_version: string;
          preprocessing_version: string;
          embedding_dimension: number;
          vector: Json;
          is_active?: boolean;
          consent_granted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          model_id?: string;
          model_version?: string;
          preprocessing_version?: string;
          embedding_dimension?: number;
          vector?: Json;
          is_active?: boolean;
          consent_granted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_face_templates_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
      subjects: {
        Row: {
          id: number;
          code: string;
          name: string;
          section: string;
          teacher_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: never;
          code: string;
          name?: string;
          section?: string;
          teacher_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: never;
          code?: string;
          name?: string;
          section?: string;
          teacher_id?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subjects_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          }
        ];
      };
      subject_students: {
        Row: {
          subject_id: number;
          student_id: string;
          created_at: string | null;
        };
        Insert: {
          subject_id: number;
          student_id: string;
          created_at?: string | null;
        };
        Update: {
          subject_id?: number;
          student_id?: string;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subject_students_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subject_students_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
      attendance_sessions: {
        Row: {
          id: string;
          subject_id: number;
          teacher_id: string;
          idempotency_key: string;
          recorded_at: string;
          photo_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: number;
          teacher_id: string;
          idempotency_key: string;
          recorded_at?: string;
          photo_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: number;
          teacher_id?: string;
          idempotency_key?: string;
          recorded_at?: string;
          photo_count?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_sessions_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          }
        ];
      };
      attendance_logs: {
        Row: {
          id: number;
          timestamp: string | null;
          subject_id: number | null;
          student_id: string | null;
          is_present: boolean | null;
          session_id: string | null;
          source_photos: string[];
          is_manual_override: boolean;
        };
        Insert: {
          id?: never;
          timestamp?: string | null;
          subject_id?: number | null;
          student_id?: string | null;
          is_present?: boolean | null;
          session_id?: string | null;
          source_photos?: string[];
          is_manual_override?: boolean;
        };
        Update: {
          id?: never;
          timestamp?: string | null;
          subject_id?: number | null;
          student_id?: string | null;
          is_present?: boolean | null;
          session_id?: string | null;
          source_photos?: string[];
          is_manual_override?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_logs_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_logs_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_logs_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "attendance_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_registration_conflicts: {
        Args: {
          p_role: string;
          p_id: string;
          p_email: string;
          p_mobile: string;
        };
        Returns: {
          id_taken: boolean;
          email_taken: boolean;
          mobile_taken: boolean;
        }[];
      };
      resolve_login_identifier: {
        Args: {
          p_role: string;
          p_identifier: string;
        };
        Returns: {
          email_id: string;
          is_linked: boolean;
        }[];
      };
      verify_legacy_teacher_password: {
        Args: {
          p_identifier: string;
          p_password: string;
        };
        Returns: {
          verified: boolean;
          teacher_id: string | null;
          email_id: string | null;
        }[];
      };
      claim_legacy_profile: {
        Args: {
          p_role: string;
        };
        Returns: {
          linked: boolean;
          profile_id: string | null;
        }[];
      };
      lookup_subject_by_code: {
        Args: {
          p_code: string;
        };
        Returns: {
          id: number;
          code: string;
          name: string;
          section: string;
        }[];
      };
      delete_teacher_subject: {
        Args: {
          p_subject_id: number;
        };
        Returns: {
          deleted: boolean;
          subject_id: number | null;
          code: string | null;
          name: string | null;
        }[];
      };
      save_attendance_session: {
        Args: {
          p_subject_id: number;
          p_idempotency_key: string;
          p_photo_count: number;
          p_entries: Json;
        };
        Returns: {
          session_id: string;
          inserted_count: number;
          deduplicated: boolean;
          recorded_at: string;
        }[];
      };
      verify_student_face_for_otp: {
        Args: {
          p_identifier: string;
          p_model_id: string;
          p_model_version: string;
          p_preprocessing_version: string;
          p_embedding_dimension: number;
          p_probe_vector: number[];
          p_min_similarity?: number;
        };
        Returns: {
          verified: boolean;
          student_id: string | null;
          email_id: string | null;
          reason: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
