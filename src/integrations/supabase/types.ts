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
      admin_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          id: string
          related_entity_id: string | null
          related_entity_type: string | null
          related_user_id: string | null
          status: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          description?: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          related_user_id?: string | null
          status?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          related_user_id?: string | null
          status?: string
        }
        Relationships: []
      }
      application_links: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          landlord_id: string
          property_id: string
          unique_token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          landlord_id: string
          property_id: string
          unique_token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          landlord_id?: string
          property_id?: string
          unique_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_links_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          dispute_reason: string
          dispute_type: string
          evidence_url: string | null
          id: string
          landlord_id: string | null
          property_id: string | null
          rental_record_id: string | null
          resolution_status: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispute_reason: string
          dispute_type?: string
          evidence_url?: string | null
          id?: string
          landlord_id?: string | null
          property_id?: string | null
          rental_record_id?: string | null
          resolution_status?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispute_reason?: string
          dispute_type?: string
          evidence_url?: string | null
          id?: string
          landlord_id?: string | null
          property_id?: string | null
          rental_record_id?: string | null
          resolution_status?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_rental_record_id_fkey"
            columns: ["rental_record_id"]
            isOneToOne: false
            referencedRelation: "rental_records"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_requests: {
        Row: {
          created_at: string
          id: string
          max_allowed_amount: number | null
          purpose: string
          requested_amount: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_allowed_amount?: number | null
          purpose?: string
          requested_amount: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_allowed_amount?: number | null
          purpose?: string
          requested_amount?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          created_at: string
          id: string
          message: string
          property_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          property_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          property_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      landlord_profiles: {
        Row: {
          average_tenant_rating: number | null
          complaint_count: number | null
          created_at: string
          id: string
          maintenance_responsiveness_score: number | null
          profile_visibility: string
          tenant_satisfaction_score: number | null
          updated_at: string
          user_id: string
          verified_properties: number | null
        }
        Insert: {
          average_tenant_rating?: number | null
          complaint_count?: number | null
          created_at?: string
          id?: string
          maintenance_responsiveness_score?: number | null
          profile_visibility?: string
          tenant_satisfaction_score?: number | null
          updated_at?: string
          user_id: string
          verified_properties?: number | null
        }
        Update: {
          average_tenant_rating?: number | null
          complaint_count?: number | null
          created_at?: string
          id?: string
          maintenance_responsiveness_score?: number | null
          profile_visibility?: string
          tenant_satisfaction_score?: number | null
          updated_at?: string
          user_id?: string
          verified_properties?: number | null
        }
        Relationships: []
      }
      landlord_verification: {
        Row: {
          created_at: string
          document_type: string
          document_url: string
          id: string
          landlord_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          verification_status: string
        }
        Insert: {
          created_at?: string
          document_type?: string
          document_url: string
          id?: string
          landlord_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          verification_status?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          document_url?: string
          id?: string
          landlord_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          verification_status?: string
        }
        Relationships: []
      }
      landlords: {
        Row: {
          created_at: string
          id: string
          phone_verified: boolean
          property_count: number
          user_id: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone_verified?: boolean
          property_count?: number
          user_id: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          phone_verified?: boolean
          property_count?: number
          user_id?: string
          verification_status?: string
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string
          file_path: string
          file_type: string
          id: string
          message_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_type?: string
          id?: string
          message_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_type?: string
          id?: string
          message_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          read_status: boolean
          receiver_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          sender_id: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string
          read_status?: boolean
          receiver_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sender_id: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          read_status?: boolean
          receiver_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sender_id?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          reason: string
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          reason?: string
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          reason?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          message_id: string | null
          notification_type: string
          read_status: boolean
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          message_id?: string | null
          notification_type?: string
          read_status?: boolean
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          message_id?: string | null
          notification_type?: string
          read_status?: boolean
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_evidence: {
        Row: {
          amount: number | null
          created_at: string
          evidence_type: string
          id: string
          payment_date: string | null
          raw_text: string | null
          receiver_name: string | null
          tenant_id: string
          transaction_code: string | null
          verification_status: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          evidence_type?: string
          id?: string
          payment_date?: string | null
          raw_text?: string | null
          receiver_name?: string | null
          tenant_id: string
          transaction_code?: string | null
          verification_status?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          evidence_type?: string
          id?: string
          payment_date?: string | null
          raw_text?: string | null
          receiver_name?: string | null
          tenant_id?: string
          transaction_code?: string | null
          verification_status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          deletion_requested_at: string | null
          deletion_status: string
          email: string | null
          id: string
          is_suspended: boolean
          name: string
          phone: string | null
          role: string
          tenant_verification_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          deletion_status?: string
          email?: string | null
          id?: string
          is_suspended?: boolean
          name?: string
          phone?: string | null
          role?: string
          tenant_verification_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          deletion_status?: string
          email?: string | null
          id?: string
          is_suspended?: boolean
          name?: string
          phone?: string | null
          role?: string
          tenant_verification_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          bathrooms: number
          bedrooms: number
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          is_available: boolean
          landlord_id: string
          location: string
          occupied_units: number
          rent_amount: number
          title: string
          total_units: number
          updated_at: string
        }
        Insert: {
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_available?: boolean
          landlord_id: string
          location: string
          occupied_units?: number
          rent_amount: number
          title: string
          total_units?: number
          updated_at?: string
        }
        Update: {
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_available?: boolean
          landlord_id?: string
          location?: string
          occupied_units?: number
          rent_amount?: number
          title?: string
          total_units?: number
          updated_at?: string
        }
        Relationships: []
      }
      property_applications: {
        Row: {
          application_status: string
          apply_source: string
          created_at: string
          id: string
          landlord_id: string
          message: string | null
          property_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          application_status?: string
          apply_source?: string
          created_at?: string
          id?: string
          landlord_id: string
          message?: string | null
          property_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          application_status?: string
          apply_source?: string
          created_at?: string
          id?: string
          landlord_id?: string
          message?: string | null
          property_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_demand: {
        Row: {
          average_rent: number
          created_at: string
          id: string
          location_city: string
          location_county: string
          total_searches: number
          updated_at: string
          vacancy_rate: number
        }
        Insert: {
          average_rent?: number
          created_at?: string
          id?: string
          location_city: string
          location_county: string
          total_searches?: number
          updated_at?: string
          vacancy_rate?: number
        }
        Update: {
          average_rent?: number
          created_at?: string
          id?: string
          location_city?: string
          location_county?: string
          total_searches?: number
          updated_at?: string
          vacancy_rate?: number
        }
        Relationships: []
      }
      rent_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          landlord_id: string
          mpesa_transaction_code: string | null
          payment_date: string | null
          payment_method: string
          property_id: string | null
          tenancy_id: string | null
          tenant_id: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          landlord_id: string
          mpesa_transaction_code?: string | null
          payment_date?: string | null
          payment_method?: string
          property_id?: string | null
          tenancy_id?: string | null
          tenant_id: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          landlord_id?: string
          mpesa_transaction_code?: string | null
          payment_date?: string | null
          payment_method?: string
          property_id?: string | null
          tenancy_id?: string | null
          tenant_id?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_records: {
        Row: {
          created_at: string
          id: string
          landlord_id: string
          payment_date: string | null
          payment_status: string
          property_id: string | null
          rent_amount: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          landlord_id: string
          payment_date?: string | null
          payment_status?: string
          property_id?: string | null
          rent_amount: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          landlord_id?: string
          payment_date?: string | null
          payment_status?: string
          property_id?: string | null
          rent_amount?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      review_disputes: {
        Row: {
          created_at: string
          dispute_status: string
          id: string
          reason: string
          reported_by: string
          review_id: string
        }
        Insert: {
          created_at?: string
          dispute_status?: string
          id?: string
          reason: string
          reported_by: string
          review_id: string
        }
        Update: {
          created_at?: string
          dispute_status?: string
          id?: string
          reason?: string
          reported_by?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_disputes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "tenancy_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      service_credit_purchases: {
        Row: {
          created_at: string
          credits_purchased: number
          id: string
          payment_amount: number
          payment_method: string
          transaction_code: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_purchased?: number
          id?: string
          payment_amount?: number
          payment_method?: string
          transaction_code?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credits_purchased?: number
          id?: string
          payment_amount?: number
          payment_method?: string
          transaction_code?: string | null
          user_id?: string
        }
        Relationships: []
      }
      service_request_deposits: {
        Row: {
          created_at: string
          deposit_amount: number
          deposit_status: string
          id: string
          payment_method: string
          request_id: string
          requester_id: string
          transaction_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit_amount?: number
          deposit_status?: string
          id?: string
          payment_method?: string
          request_id: string
          requester_id: string
          transaction_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit_amount?: number
          deposit_status?: string
          id?: string
          payment_method?: string
          request_id?: string
          requester_id?: string
          transaction_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_deposits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          location: string
          rating: number | null
          requester_id: string
          review: string | null
          scheduled_date: string | null
          service_category: string
          status: string
          worker_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          location: string
          rating?: number | null
          requester_id: string
          review?: string | null
          scheduled_date?: string | null
          service_category: string
          status?: string
          worker_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string
          rating?: number | null
          requester_id?: string
          review?: string | null
          scheduled_date?: string | null
          service_category?: string
          status?: string
          worker_id?: string | null
        }
        Relationships: []
      }
      service_worker_profiles: {
        Row: {
          availability_status: string
          city: string | null
          created_at: string
          description: string | null
          id: string
          identity_document_url: string | null
          jobs_completed: number | null
          landlord_endorsements_count: number | null
          latitude: number | null
          longitude: number | null
          phone_verified: boolean | null
          rating_score: number | null
          service_category: string
          updated_at: string
          user_id: string
          verification_status: string
          visibility_status: string
          years_experience: number | null
        }
        Insert: {
          availability_status?: string
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          identity_document_url?: string | null
          jobs_completed?: number | null
          landlord_endorsements_count?: number | null
          latitude?: number | null
          longitude?: number | null
          phone_verified?: boolean | null
          rating_score?: number | null
          service_category: string
          updated_at?: string
          user_id: string
          verification_status?: string
          visibility_status?: string
          years_experience?: number | null
        }
        Update: {
          availability_status?: string
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          identity_document_url?: string | null
          jobs_completed?: number | null
          landlord_endorsements_count?: number | null
          latitude?: number | null
          longitude?: number | null
          phone_verified?: boolean | null
          rating_score?: number | null
          service_category?: string
          updated_at?: string
          user_id?: string
          verification_status?: string
          visibility_status?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      service_workers: {
        Row: {
          created_at: string
          experience_years: number | null
          id: string
          is_available: boolean
          landlord_endorser_id: string | null
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          phone: string | null
          rating: number | null
          service_category: string
          user_id: string | null
          verification_status: string
        }
        Insert: {
          created_at?: string
          experience_years?: number | null
          id?: string
          is_available?: boolean
          landlord_endorser_id?: string | null
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          phone?: string | null
          rating?: number | null
          service_category: string
          user_id?: string | null
          verification_status?: string
        }
        Update: {
          created_at?: string
          experience_years?: number | null
          id?: string
          is_available?: boolean
          landlord_endorser_id?: string | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          phone?: string | null
          rating?: number | null
          service_category?: string
          user_id?: string | null
          verification_status?: string
        }
        Relationships: []
      }
      tenancy_records: {
        Row: {
          created_at: string
          id: string
          landlord_id: string
          lease_end_date: string | null
          lease_start_date: string | null
          monthly_rent: number
          property_id: string | null
          tenancy_status: string
          tenant_id: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          landlord_id: string
          lease_end_date?: string | null
          lease_start_date?: string | null
          monthly_rent?: number
          property_id?: string | null
          tenancy_status?: string
          tenant_id: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          landlord_id?: string
          lease_end_date?: string | null
          lease_start_date?: string | null
          monthly_rent?: number
          property_id?: string | null
          tenancy_status?: string
          tenant_id?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancy_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancy_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          review_type: string
          reviewee_id: string
          reviewer_id: string
          tenancy_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          review_type?: string
          reviewee_id: string
          reviewer_id: string
          tenancy_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          review_type?: string
          reviewee_id?: string
          reviewer_id?: string
          tenancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancy_reviews_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancy_records"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_credit_passport: {
        Row: {
          confidence_level: string
          created_at: string
          credit_score: number
          id: string
          late_payments_count: number
          missed_payments_count: number
          tenant_id: string
          total_service_requests_completed: number
          total_verified_rent_payments: number
          updated_at: string
        }
        Insert: {
          confidence_level?: string
          created_at?: string
          credit_score?: number
          id?: string
          late_payments_count?: number
          missed_payments_count?: number
          tenant_id: string
          total_service_requests_completed?: number
          total_verified_rent_payments?: number
          updated_at?: string
        }
        Update: {
          confidence_level?: string
          created_at?: string
          credit_score?: number
          id?: string
          late_payments_count?: number
          missed_payments_count?: number
          tenant_id?: string
          total_service_requests_completed?: number
          total_verified_rent_payments?: number
          updated_at?: string
        }
        Relationships: []
      }
      tenant_risk: {
        Row: {
          created_at: string
          disputes_count: number
          id: string
          late_payments_count: number
          missed_payments_count: number
          risk_category: string
          risk_score: number
          tenant_id: string
          updated_at: string
          verified_payments_count: number
        }
        Insert: {
          created_at?: string
          disputes_count?: number
          id?: string
          late_payments_count?: number
          missed_payments_count?: number
          risk_category?: string
          risk_score?: number
          tenant_id: string
          updated_at?: string
          verified_payments_count?: number
        }
        Update: {
          created_at?: string
          disputes_count?: number
          id?: string
          late_payments_count?: number
          missed_payments_count?: number
          risk_category?: string
          risk_score?: number
          tenant_id?: string
          updated_at?: string
          verified_payments_count?: number
        }
        Relationships: []
      }
      tenant_scores: {
        Row: {
          confidence_level: string
          data_sources_count: number
          last_updated: string
          late_payments: number
          missed_payments: number
          score: number
          tenant_id: string
          total_payments: number
          verified_sms_payments: number
        }
        Insert: {
          confidence_level?: string
          data_sources_count?: number
          last_updated?: string
          late_payments?: number
          missed_payments?: number
          score?: number
          tenant_id: string
          total_payments?: number
          verified_sms_payments?: number
        }
        Update: {
          confidence_level?: string
          data_sources_count?: number
          last_updated?: string
          late_payments?: number
          missed_payments?: number
          score?: number
          tenant_id?: string
          total_payments?: number
          verified_sms_payments?: number
        }
        Relationships: []
      }
      tenant_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          id: string
          identity_verified: boolean
          name: string
          national_id: string | null
          phone: string | null
          phone_verified: boolean
          phone_verified_at: string | null
          profile_photo_url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          identity_verified?: boolean
          name: string
          national_id?: string | null
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          profile_photo_url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          identity_verified?: boolean
          name?: string
          national_id?: string | null
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          profile_photo_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      thread_participants: {
        Row: {
          created_at: string
          id: string
          role: string
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          application_id: string | null
          created_at: string
          id: string
          landlord_id: string | null
          property_id: string | null
          service_worker_id: string | null
          subject: string | null
          tenancy_id: string | null
          tenant_id: string | null
          thread_type: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          id?: string
          landlord_id?: string | null
          property_id?: string | null
          service_worker_id?: string | null
          subject?: string | null
          tenancy_id?: string | null
          tenant_id?: string | null
          thread_type?: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          id?: string
          landlord_id?: string | null
          property_id?: string | null
          service_worker_id?: string | null
          subject?: string | null
          tenancy_id?: string | null
          tenant_id?: string | null
          thread_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_network: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          relation_type: string
          to_user_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          relation_type: string
          to_user_id: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          relation_type?: string
          to_user_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
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
      user_service_credits: {
        Row: {
          created_at: string
          credits_remaining: number
          id: string
          last_reset_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_remaining?: number
          id?: string
          last_reset_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_remaining?: number
          id?: string
          last_reset_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_queue: {
        Row: {
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: string
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role: string
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      worker_complaints: {
        Row: {
          complaint_type: string
          created_at: string
          description: string
          id: string
          requester_id: string
          status: string
          worker_id: string
        }
        Insert: {
          complaint_type?: string
          created_at?: string
          description: string
          id?: string
          requester_id: string
          status?: string
          worker_id: string
        }
        Update: {
          complaint_type?: string
          created_at?: string
          description?: string
          id?: string
          requester_id?: string
          status?: string
          worker_id?: string
        }
        Relationships: []
      }
      worker_endorsements: {
        Row: {
          created_at: string
          endorsement_notes: string | null
          id: string
          landlord_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          endorsement_notes?: string | null
          id?: string
          landlord_id: string
          worker_id: string
        }
        Update: {
          created_at?: string
          endorsement_notes?: string | null
          id?: string
          landlord_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_endorsements_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "service_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_reviews: {
        Row: {
          created_at: string
          id: string
          rating: number
          review_text: string | null
          reviewer_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          reviewer_id: string
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          reviewer_id?: string
          worker_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_apply_property: {
        Args: { _message?: string; _property_id: string }
        Returns: Json
      }
      calculate_credit_passport: {
        Args: { _tenant_id: string }
        Returns: number
      }
      calculate_tenant_risk: { Args: { _tenant_id: string }; Returns: number }
      calculate_tenant_score: { Args: { _tenant_id: string }; Returns: number }
      confirm_tenancy_payment: { Args: { _txn_id: string }; Returns: Json }
      find_or_create_property_thread: {
        Args: {
          _application_id?: string
          _landlord_id: string
          _property_id: string
          _tenancy_id?: string
          _tenant_id: string
        }
        Returns: string
      }
      find_or_create_tenant: {
        Args: {
          _name: string
          _national_id: string
          _phone: string
          _user_id: string
        }
        Returns: string
      }
      get_application_link_by_token: {
        Args: { _token: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          landlord_id: string
          property_id: string
          unique_token: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_thread_participant: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
      record_tenancy_payment: {
        Args: {
          _amount: number
          _code?: string
          _method?: string
          _tenancy_id: string
        }
        Returns: Json
      }
      refresh_property_demand: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
