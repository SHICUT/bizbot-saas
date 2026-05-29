/**
 * Automation Workflow Types
 *
 * Defines the contract between our app and n8n workflows.
 * n8n receives webhook payloads from us and executes workflows.
 */

// ─── Webhook Event Types (sent TO n8n) ──────────────────────────────────────

export type AutomationEvent =
  | NewLeadEvent
  | AppointmentReminderEvent
  | MissedCustomerEvent
  | PaymentReminderEvent
  | TrialExpiringEvent;

export interface NewLeadEvent {
  type: "new_lead";
  timestamp: string;
  business_id: string;
  lead: {
    id: string;
    name: string | null;
    phone: string;
    wa_id: string;
    first_message: string;
    source: string;
  };
  business: {
    name: string;
    phone_number_id: string;
    access_token: string;
  };
}

export interface AppointmentReminderEvent {
  type: "appointment_reminder";
  timestamp: string;
  business_id: string;
  appointment: {
    id: string;
    title: string;
    service: string;
    scheduled_at: string;
    duration_minutes: number;
  };
  lead: {
    id: string;
    name: string | null;
    phone: string;
    wa_id: string;
  };
  business: {
    name: string;
    phone_number_id: string;
    access_token: string;
  };
  reminder_type: "24h" | "1h" | "15min";
}

export interface MissedCustomerEvent {
  type: "missed_customer";
  timestamp: string;
  business_id: string;
  lead: {
    id: string;
    name: string | null;
    phone: string;
    wa_id: string;
    last_message_at: string;
    days_inactive: number;
    previous_interest: string | null;
  };
  business: {
    name: string;
    phone_number_id: string;
    access_token: string;
  };
}

export interface PaymentReminderEvent {
  type: "payment_reminder";
  timestamp: string;
  business_id: string;
  subscription: {
    id: string;
    plan: string;
    status: string;
    current_period_end: string;
    days_until_expiry: number;
  };
  business: {
    name: string;
    owner_email: string;
    owner_phone: string | null;
  };
}

export interface TrialExpiringEvent {
  type: "trial_expiring";
  timestamp: string;
  business_id: string;
  subscription: {
    id: string;
    trial_end: string;
    days_remaining: number;
    messages_used: number;
    message_limit: number;
  };
  business: {
    name: string;
    owner_email: string;
    owner_phone: string | null;
  };
}

// ─── n8n Callback Types (received FROM n8n) ─────────────────────────────────

export interface N8nCallbackPayload {
  workflow_id: string;
  execution_id: string;
  event_type: string;
  status: "success" | "error";
  result?: {
    message_sent?: boolean;
    lead_updated?: boolean;
    error?: string;
  };
  metadata?: Record<string, unknown>;
}

// ─── Workflow Configuration ─────────────────────────────────────────────────

export interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  trigger: "cron" | "webhook" | "event";
  schedule?: string; // cron expression
  webhook_url?: string;
  enabled: boolean;
  retry_config: {
    max_attempts: number;
    backoff_ms: number[];
  };
}
