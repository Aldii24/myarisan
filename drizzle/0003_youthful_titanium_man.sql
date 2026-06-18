ALTER TABLE "users" ADD COLUMN "pending_action" varchar(32);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pending_action_expires_at" timestamp with time zone;