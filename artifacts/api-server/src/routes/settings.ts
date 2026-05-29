import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { SaveSettingsBody } from "@workspace/api-zod";

const router = Router();

router.get("/settings", async (req, res) => {
  try {
    let [settings] = await db.select().from(settingsTable).limit(1);

    if (!settings) {
      const [created] = await db
        .insert(settingsTable)
        .values({
          executor: "KRNL",
          platform: "PC",
          obfuscation: "none",
          robloxVersion: "latest",
          scriptStyle: "clean",
          defaultMode: "Chat",
          systemPromptExtra: null,
          uiLibPreference: "none",
        })
        .returning();
      settings = created;
    }

    res.json(settings);
  } catch (err) {
    req.log.error({ err }, "Failed to get settings");
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const body = SaveSettingsBody.parse(req.body);

    let [existing] = await db.select().from(settingsTable).limit(1);

    let settings;
    if (existing) {
      const [updated] = await db
        .update(settingsTable)
        .set({
          executor: body.executor ?? existing.executor,
          platform: body.platform ?? existing.platform,
          obfuscation: body.obfuscation ?? existing.obfuscation,
          robloxVersion: body.robloxVersion ?? existing.robloxVersion,
          scriptStyle: body.scriptStyle ?? existing.scriptStyle,
          defaultMode: body.defaultMode ?? existing.defaultMode,
          systemPromptExtra: body.systemPromptExtra ?? existing.systemPromptExtra,
          uiLibPreference: body.uiLibPreference ?? existing.uiLibPreference,
        })
        .returning();
      settings = updated;
    } else {
      const [created] = await db
        .insert(settingsTable)
        .values({
          executor: body.executor || "KRNL",
          platform: body.platform || "PC",
          obfuscation: body.obfuscation || "none",
          robloxVersion: body.robloxVersion || "latest",
          scriptStyle: body.scriptStyle || "clean",
          defaultMode: body.defaultMode || "Chat",
          systemPromptExtra: body.systemPromptExtra || null,
          uiLibPreference: body.uiLibPreference || "none",
        })
        .returning();
      settings = created;
    }

    res.json(settings);
  } catch (err) {
    req.log.error({ err }, "Failed to save settings");
    res.status(500).json({ error: "Failed to save settings" });
  }
});

export default router;
