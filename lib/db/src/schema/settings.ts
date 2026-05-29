import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("agent_settings", {
  id: serial("id").primaryKey(),
  executor: text("executor"),
  platform: text("platform"),
  obfuscation: text("obfuscation"),
  robloxVersion: text("roblox_version"),
  scriptStyle: text("script_style"),
  defaultMode: text("default_mode"),
  systemPromptExtra: text("system_prompt_extra"),
  uiLibPreference: text("ui_lib_preference"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
