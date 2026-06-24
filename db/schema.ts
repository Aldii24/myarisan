import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const arisanGroupStatusEnum = pgEnum("arisan_group_status", [
  "active",
  "inactive",
  "archived",
]);

export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  "arisan_group",
  "membership",
  "period",
  "payment",
  "plan",
  "subscription",
  "invoice",
  "usage_counter",
  "message_log",
  "dashboard_notification",
  "user",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "pending",
  "pending_verification",
  "paid",
  "rejected",
  "expired",
]);

export const joinStatusEnum = pgEnum("join_status", [
  "invited",
  "claimed",
  "removed",
]);

export const membershipRoleEnum = pgEnum("membership_role", ["admin", "member"]);

export const messageCostTypeEnum = pgEnum("message_cost_type", [
  "free_window",
  "skipped_outside_window",
  "manual",
  "unknown",
]);

export const messageDirectionEnum = pgEnum("message_direction", [
  "inbound",
  "outbound",
]);

export const messageProcessedStatusEnum = pgEnum("message_processed_status", [
  "received",
  "processed",
  "failed",
  "skipped",
]);

export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "image",
  "document",
  "interactive",
  "system",
  "unknown",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["manual_qris"]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "confirmed",
  "rejected",
  "partial",
  "manual",
  "duplicate_check",
]);

export const periodStatusEnum = pgEnum("period_status", [
  "active",
  "closed",
  "draft",
]);

export const periodTypeEnum = pgEnum("period_type", ["weekly", "monthly"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trial",
  "active",
  "expired",
  "canceled",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    phone: varchar("phone", { length: 32 }).notNull(),
    name: varchar("name", { length: 160 }),
    pinHash: text("pin_hash"),
    lastInboundAt: timestamp("last_inbound_at", { withTimezone: true }),
    serviceWindowUntil: timestamp("service_window_until", { withTimezone: true }),
    pendingAction: varchar("pending_action", { length: 32 }),
    pendingActionData: jsonb("pending_action_data").$type<Record<string, unknown>>(),
    pendingActionExpiresAt: timestamp("pending_action_expires_at", {
      withTimezone: true,
    }),
    // The arisan a multi-group WhatsApp user last selected; context commands
    // target this group so the bot doesn't re-ask on every message.
    activeArisanId: uuid("active_arisan_id").references(
      (): AnyPgColumn => arisanGroups.id,
      { onDelete: "set null" },
    ),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("users_phone_unique").on(table.phone),
    index("users_service_window_until_idx").on(table.serviceWindowUntil),
  ],
);

export const arisanGroups = pgTable(
  "arisan_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminUserId: uuid("admin_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 180 }).notNull(),
    amountPerPeriod: integer("amount_per_period").notNull(),
    periodType: periodTypeEnum("period_type").notNull(),
    dueDay: integer("due_day"),
    bankAccountText: text("bank_account_text"),
    joinCode: varchar("join_code", { length: 24 }).notNull(),
    status: arisanGroupStatusEnum("status").notNull().default("active"),
    ...timestamps(),
  },
  (table) => [
    index("arisan_groups_admin_user_id_idx").on(table.adminUserId),
    uniqueIndex("arisan_groups_join_code_unique").on(table.joinCode),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    arisanGroupId: uuid("arisan_group_id")
      .notNull()
      .references(() => arisanGroups.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    role: membershipRoleEnum("role").notNull().default("member"),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    joinStatus: joinStatusEnum("join_status").notNull().default("invited"),
    turnOrder: integer("turn_order"),
    ...timestamps(),
  },
  (table) => [
    index("memberships_arisan_group_id_idx").on(table.arisanGroupId),
    index("memberships_user_id_idx").on(table.userId),
    index("memberships_user_group_idx").on(table.userId, table.arisanGroupId),
    uniqueIndex("memberships_group_display_name_unique").on(
      table.arisanGroupId,
      table.displayName,
    ),
  ],
);

export const periods = pgTable(
  "periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    arisanGroupId: uuid("arisan_group_id")
      .notNull()
      .references(() => arisanGroups.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    startDate: date("start_date").notNull(),
    dueDate: date("due_date").notNull(),
    drawMemberId: uuid("draw_member_id").references(() => memberships.id, {
      onDelete: "set null",
    }),
    status: periodStatusEnum("status").notNull().default("draft"),
    ...timestamps(),
  },
  (table) => [
    index("periods_arisan_group_id_idx").on(table.arisanGroupId),
    index("periods_group_status_idx").on(table.arisanGroupId, table.status),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    arisanGroupId: uuid("arisan_group_id")
      .notNull()
      .references(() => arisanGroups.id, { onDelete: "cascade" }),
    periodId: uuid("period_id")
      .notNull()
      .references(() => periods.id, { onDelete: "cascade" }),
    memberUserId: uuid("member_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    amount: integer("amount"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    proofImageUrl: text("proof_image_url"),
    proofImageHash: varchar("proof_image_hash", { length: 128 }),
    note: text("note"),
    ocrText: text("ocr_text"),
    aiResultJson: jsonb("ai_result_json").$type<Record<string, unknown>>(),
    duplicateOfPaymentId: uuid("duplicate_of_payment_id"),
    confirmedByUserId: uuid("confirmed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("payments_arisan_group_id_idx").on(table.arisanGroupId),
    index("payments_period_id_idx").on(table.periodId),
    index("payments_member_user_id_idx").on(table.memberUserId),
    index("payments_status_idx").on(table.status),
    index("payments_group_status_idx").on(table.arisanGroupId, table.status),
    index("payments_proof_image_hash_idx").on(table.proofImageHash),
  ],
);

export const plans = pgTable(
  "plans",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    price: integer("price").notNull(),
    maxMembers: integer("max_members").notNull(),
    monthlyProofLimit: integer("monthly_proof_limit").notNull(),
    maxGroups: integer("max_groups").notNull().default(1),
    maxAdmins: integer("max_admins").notNull().default(1),
    featuresJson: jsonb("features_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    ...timestamps(),
  },
  (table) => [uniqueIndex("plans_name_unique").on(table.name)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    arisanGroupId: uuid("arisan_group_id")
      .notNull()
      .references(() => arisanGroups.id, { onDelete: "cascade" }),
    adminUserId: uuid("admin_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    planId: varchar("plan_id", { length: 32 })
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    status: subscriptionStatusEnum("status").notNull().default("trial"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("subscriptions_arisan_group_id_unique").on(table.arisanGroupId),
    index("subscriptions_admin_user_id_idx").on(table.adminUserId),
    index("subscriptions_status_idx").on(table.status),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    arisanGroupId: uuid("arisan_group_id")
      .notNull()
      .references(() => arisanGroups.id, { onDelete: "cascade" }),
    adminUserId: uuid("admin_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    planId: varchar("plan_id", { length: 32 })
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    status: invoiceStatusEnum("status").notNull().default("pending"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("manual_qris"),
    proofImageUrl: text("proof_image_url"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    verifiedByUserId: uuid("verified_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    rejectionReason: text("rejection_reason"),
    ...timestamps(),
  },
  (table) => [
    index("invoices_arisan_group_id_idx").on(table.arisanGroupId),
    index("invoices_admin_user_id_idx").on(table.adminUserId),
    index("invoices_status_idx").on(table.status),
  ],
);

export const usageCounters = pgTable(
  "usage_counters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    arisanGroupId: uuid("arisan_group_id")
      .notNull()
      .references(() => arisanGroups.id, { onDelete: "cascade" }),
    month: varchar("month", { length: 7 }).notNull(),
    proofUsed: integer("proof_used").notNull().default(0),
    proofLimit: integer("proof_limit").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("usage_counters_arisan_group_id_idx").on(table.arisanGroupId),
    uniqueIndex("usage_counters_group_month_unique").on(
      table.arisanGroupId,
      table.month,
    ),
  ],
);

export const messageLogs = pgTable(
  "message_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    whatsappMessageId: varchar("whatsapp_message_id", { length: 120 }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    fromPhone: varchar("from_phone", { length: 32 }),
    direction: messageDirectionEnum("direction").notNull(),
    messageType: messageTypeEnum("message_type").notNull().default("unknown"),
    body: text("body"),
    mediaUrl: text("media_url"),
    costType: messageCostTypeEnum("cost_type").notNull().default("unknown"),
    processedStatus: messageProcessedStatusEnum("processed_status")
      .notNull()
      .default("received"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("message_logs_whatsapp_message_id_unique").on(
      table.whatsappMessageId,
    ),
    index("message_logs_user_id_idx").on(table.userId),
    index("message_logs_from_phone_idx").on(table.fromPhone),
    index("message_logs_direction_idx").on(table.direction),
    index("message_logs_processed_status_idx").on(table.processedStatus),
  ],
);

export const dashboardNotifications = pgTable(
  "dashboard_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    arisanGroupId: uuid("arisan_group_id").references(() => arisanGroups.id, {
      onDelete: "cascade",
    }),
    title: varchar("title", { length: 160 }).notNull(),
    message: text("message").notNull(),
    type: varchar("type", { length: 80 }).notNull().default("info"),
    isRead: boolean("is_read").notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    index("dashboard_notifications_user_id_idx").on(table.userId),
    index("dashboard_notifications_arisan_group_id_idx").on(table.arisanGroupId),
    index("dashboard_notifications_is_read_idx").on(table.isRead),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    arisanGroupId: uuid("arisan_group_id").references(() => arisanGroups.id, {
      onDelete: "set null",
    }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: auditEntityTypeEnum("entity_type").notNull(),
    entityId: varchar("entity_id", { length: 120 }),
    beforeJson: jsonb("before_json").$type<Record<string, unknown>>(),
    afterJson: jsonb("after_json").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_arisan_group_id_idx").on(table.arisanGroupId),
    index("audit_logs_actor_user_id_idx").on(table.actorUserId),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ArisanGroup = typeof arisanGroups.$inferSelect;
export type NewArisanGroup = typeof arisanGroups.$inferInsert;
export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
export type Period = typeof periods.$inferSelect;
export type NewPeriod = typeof periods.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
