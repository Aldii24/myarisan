CREATE TYPE "public"."arisan_group_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."audit_entity_type" AS ENUM('arisan_group', 'membership', 'period', 'payment', 'plan', 'subscription', 'invoice', 'usage_counter', 'message_log', 'dashboard_notification', 'user');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('pending', 'pending_verification', 'paid', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."join_status" AS ENUM('invited', 'claimed', 'removed');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."message_cost_type" AS ENUM('free_window', 'skipped_outside_window', 'manual', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."message_processed_status" AS ENUM('received', 'processed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'image', 'document', 'interactive', 'system', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('manual_qris');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'confirmed', 'rejected', 'partial', 'manual', 'duplicate_check');--> statement-breakpoint
CREATE TYPE "public"."period_status" AS ENUM('active', 'closed', 'draft');--> statement-breakpoint
CREATE TYPE "public"."period_type" AS ENUM('weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'expired', 'canceled');--> statement-breakpoint
CREATE TABLE "arisan_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"name" varchar(180) NOT NULL,
	"amount_per_period" integer NOT NULL,
	"period_type" "period_type" NOT NULL,
	"due_day" integer,
	"bank_account_text" text,
	"join_code" varchar(24) NOT NULL,
	"status" "arisan_group_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arisan_group_id" uuid,
	"actor_user_id" uuid,
	"action" varchar(120) NOT NULL,
	"entity_type" "audit_entity_type" NOT NULL,
	"entity_id" varchar(120),
	"before_json" jsonb,
	"after_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"arisan_group_id" uuid,
	"title" varchar(160) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(80) DEFAULT 'info' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arisan_group_id" uuid NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"plan_id" varchar(32) NOT NULL,
	"amount" integer NOT NULL,
	"status" "invoice_status" DEFAULT 'pending' NOT NULL,
	"payment_method" "payment_method" DEFAULT 'manual_qris' NOT NULL,
	"proof_image_url" text,
	"paid_at" timestamp with time zone,
	"verified_by_user_id" uuid,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arisan_group_id" uuid NOT NULL,
	"user_id" uuid,
	"role" "membership_role" DEFAULT 'member' NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"join_status" "join_status" DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whatsapp_message_id" varchar(120),
	"user_id" uuid,
	"from_phone" varchar(32),
	"direction" "message_direction" NOT NULL,
	"message_type" "message_type" DEFAULT 'unknown' NOT NULL,
	"body" text,
	"media_url" text,
	"cost_type" "message_cost_type" DEFAULT 'unknown' NOT NULL,
	"processed_status" "message_processed_status" DEFAULT 'received' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arisan_group_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"member_user_id" uuid,
	"amount" integer,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"proof_image_url" text,
	"proof_image_hash" varchar(128),
	"ocr_text" text,
	"ai_result_json" jsonb,
	"duplicate_of_payment_id" uuid,
	"confirmed_by_user_id" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arisan_group_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"start_date" date NOT NULL,
	"due_date" date NOT NULL,
	"draw_member_id" uuid,
	"status" "period_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"price" integer NOT NULL,
	"max_members" integer NOT NULL,
	"monthly_proof_limit" integer NOT NULL,
	"max_groups" integer DEFAULT 1 NOT NULL,
	"max_admins" integer DEFAULT 1 NOT NULL,
	"features_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arisan_group_id" uuid NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"plan_id" varchar(32) NOT NULL,
	"status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arisan_group_id" uuid NOT NULL,
	"month" varchar(7) NOT NULL,
	"proof_used" integer DEFAULT 0 NOT NULL,
	"proof_limit" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(32) NOT NULL,
	"name" varchar(160),
	"pin_hash" text,
	"last_inbound_at" timestamp with time zone,
	"service_window_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "arisan_groups" ADD CONSTRAINT "arisan_groups_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_arisan_group_id_arisan_groups_id_fk" FOREIGN KEY ("arisan_group_id") REFERENCES "public"."arisan_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_notifications" ADD CONSTRAINT "dashboard_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_notifications" ADD CONSTRAINT "dashboard_notifications_arisan_group_id_arisan_groups_id_fk" FOREIGN KEY ("arisan_group_id") REFERENCES "public"."arisan_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_arisan_group_id_arisan_groups_id_fk" FOREIGN KEY ("arisan_group_id") REFERENCES "public"."arisan_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_arisan_group_id_arisan_groups_id_fk" FOREIGN KEY ("arisan_group_id") REFERENCES "public"."arisan_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_arisan_group_id_arisan_groups_id_fk" FOREIGN KEY ("arisan_group_id") REFERENCES "public"."arisan_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_period_id_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_user_id_users_id_fk" FOREIGN KEY ("member_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periods" ADD CONSTRAINT "periods_arisan_group_id_arisan_groups_id_fk" FOREIGN KEY ("arisan_group_id") REFERENCES "public"."arisan_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periods" ADD CONSTRAINT "periods_draw_member_id_memberships_id_fk" FOREIGN KEY ("draw_member_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_arisan_group_id_arisan_groups_id_fk" FOREIGN KEY ("arisan_group_id") REFERENCES "public"."arisan_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_arisan_group_id_arisan_groups_id_fk" FOREIGN KEY ("arisan_group_id") REFERENCES "public"."arisan_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "arisan_groups_admin_user_id_idx" ON "arisan_groups" USING btree ("admin_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "arisan_groups_join_code_unique" ON "arisan_groups" USING btree ("join_code");--> statement-breakpoint
CREATE INDEX "audit_logs_arisan_group_id_idx" ON "audit_logs" USING btree ("arisan_group_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "dashboard_notifications_user_id_idx" ON "dashboard_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dashboard_notifications_arisan_group_id_idx" ON "dashboard_notifications" USING btree ("arisan_group_id");--> statement-breakpoint
CREATE INDEX "dashboard_notifications_is_read_idx" ON "dashboard_notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "invoices_arisan_group_id_idx" ON "invoices" USING btree ("arisan_group_id");--> statement-breakpoint
CREATE INDEX "invoices_admin_user_id_idx" ON "invoices" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "memberships_arisan_group_id_idx" ON "memberships" USING btree ("arisan_group_id");--> statement-breakpoint
CREATE INDEX "memberships_user_id_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memberships_user_group_idx" ON "memberships" USING btree ("user_id","arisan_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_group_display_name_unique" ON "memberships" USING btree ("arisan_group_id","display_name");--> statement-breakpoint
CREATE UNIQUE INDEX "message_logs_whatsapp_message_id_unique" ON "message_logs" USING btree ("whatsapp_message_id");--> statement-breakpoint
CREATE INDEX "message_logs_user_id_idx" ON "message_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "message_logs_from_phone_idx" ON "message_logs" USING btree ("from_phone");--> statement-breakpoint
CREATE INDEX "message_logs_direction_idx" ON "message_logs" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "message_logs_processed_status_idx" ON "message_logs" USING btree ("processed_status");--> statement-breakpoint
CREATE INDEX "payments_arisan_group_id_idx" ON "payments" USING btree ("arisan_group_id");--> statement-breakpoint
CREATE INDEX "payments_period_id_idx" ON "payments" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "payments_member_user_id_idx" ON "payments" USING btree ("member_user_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_group_status_idx" ON "payments" USING btree ("arisan_group_id","status");--> statement-breakpoint
CREATE INDEX "payments_proof_image_hash_idx" ON "payments" USING btree ("proof_image_hash");--> statement-breakpoint
CREATE INDEX "periods_arisan_group_id_idx" ON "periods" USING btree ("arisan_group_id");--> statement-breakpoint
CREATE INDEX "periods_group_status_idx" ON "periods" USING btree ("arisan_group_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_name_unique" ON "plans" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_arisan_group_id_unique" ON "subscriptions" USING btree ("arisan_group_id");--> statement-breakpoint
CREATE INDEX "subscriptions_admin_user_id_idx" ON "subscriptions" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "usage_counters_arisan_group_id_idx" ON "usage_counters" USING btree ("arisan_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_counters_group_month_unique" ON "usage_counters" USING btree ("arisan_group_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "users_service_window_until_idx" ON "users" USING btree ("service_window_until");