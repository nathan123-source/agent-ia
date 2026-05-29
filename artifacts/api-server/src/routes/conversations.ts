import { Router } from "express";
import { db, conversationsTable, messagesTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import {
  GetConversationParams,
  UpdateConversationParams,
  UpdateConversationBody,
  DeleteConversationParams,
  CreateConversationBody,
  ExtractScriptsParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/conversations", async (req, res) => {
  try {
    const conversations = await db
      .select({
        id: conversationsTable.id,
        title: conversationsTable.title,
        mode: conversationsTable.mode,
        executor: conversationsTable.executor,
        gameTarget: conversationsTable.gameTarget,
        createdAt: conversationsTable.createdAt,
        updatedAt: conversationsTable.updatedAt,
        messageCount: sql<number>`cast(count(${messagesTable.id}) as int)`,
      })
      .from(conversationsTable)
      .leftJoin(messagesTable, eq(messagesTable.conversationId, conversationsTable.id))
      .groupBy(conversationsTable.id)
      .orderBy(desc(conversationsTable.updatedAt));

    res.json(conversations);
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const parsed = CreateConversationBody.safeParse(req.body);
    const data = parsed.success ? parsed.data : {};

    const [conv] = await db
      .insert(conversationsTable)
      .values({
        title: (data as any).title || "New Conversation",
        mode: (data as any).mode || null,
        executor: (data as any).executor || null,
        gameTarget: (data as any).gameTarget || null,
      })
      .returning();

    res.status(201).json({ ...conv, messageCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/conversations/stats", async (req, res) => {
  try {
    const [{ totalConversations }] = await db
      .select({ totalConversations: count() })
      .from(conversationsTable);

    const [{ totalMessages }] = await db
      .select({ totalMessages: count() })
      .from(messagesTable);

    const recentConversations = await db
      .select({
        id: conversationsTable.id,
        title: conversationsTable.title,
        mode: conversationsTable.mode,
        executor: conversationsTable.executor,
        gameTarget: conversationsTable.gameTarget,
        createdAt: conversationsTable.createdAt,
        updatedAt: conversationsTable.updatedAt,
        messageCount: sql<number>`cast(count(${messagesTable.id}) as int)`,
      })
      .from(conversationsTable)
      .leftJoin(messagesTable, eq(messagesTable.conversationId, conversationsTable.id))
      .groupBy(conversationsTable.id)
      .orderBy(desc(conversationsTable.updatedAt))
      .limit(5);

    // Count messages that contain code blocks (scripts)
    const allMessages = await db
      .select({ content: messagesTable.content })
      .from(messagesTable)
      .where(eq(messagesTable.role, "assistant"));

    const codeBlockRegex = /```(?:lua|luau)/gi;
    let totalScripts = 0;
    for (const msg of allMessages) {
      const matches = msg.content.match(codeBlockRegex);
      if (matches) totalScripts += matches.length;
    }

    res.json({
      totalConversations: Number(totalConversations),
      totalMessages: Number(totalMessages),
      totalScripts,
      recentConversations,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const { id } = GetConversationParams.parse({ id: Number(req.params.id) });

    const conv = await db.query.conversationsTable.findFirst({
      where: eq(conversationsTable.id, id),
    });

    if (!conv) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);

    res.json({ ...conv, messages });
  } catch (err) {
    req.log.error({ err }, "Failed to get conversation");
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.patch("/conversations/:id", async (req, res) => {
  try {
    const { id } = UpdateConversationParams.parse({ id: Number(req.params.id) });
    const body = UpdateConversationBody.parse(req.body);

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.mode !== undefined) updateData.mode = body.mode;
    if (body.executor !== undefined) updateData.executor = body.executor;
    if (body.gameTarget !== undefined) updateData.gameTarget = body.gameTarget;

    const [updated] = await db
      .update(conversationsTable)
      .set(updateData)
      .where(eq(conversationsTable.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const [{ messageCount }] = await db
      .select({ messageCount: count() })
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id));

    res.json({ ...updated, messageCount: Number(messageCount) });
  } catch (err) {
    req.log.error({ err }, "Failed to update conversation");
    res.status(500).json({ error: "Failed to update conversation" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  try {
    const { id } = DeleteConversationParams.parse({ id: Number(req.params.id) });

    await db.delete(conversationsTable).where(eq(conversationsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/conversations/:id/scripts", async (req, res) => {
  try {
    const { id } = ExtractScriptsParams.parse({ id: Number(req.params.id) });

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);

    const scripts: Array<{ index: number; code: string; language: string; messageId: number }> = [];
    let scriptIndex = 0;

    const codeBlockRegex = /```(lua|luau|javascript|python|[a-z]*)\n?([\s\S]*?)```/gi;

    for (const msg of messages) {
      const content = msg.content;
      let match: RegExpExecArray | null;
      const regex = new RegExp(codeBlockRegex.source, "gi");
      while ((match = regex.exec(content)) !== null) {
        const language = match[1] || "lua";
        const code = match[2].trim();
        if (code.length > 0) {
          scripts.push({
            index: scriptIndex++,
            code,
            language,
            messageId: msg.id,
          });
        }
      }
    }

    res.json(scripts);
  } catch (err) {
    req.log.error({ err }, "Failed to extract scripts");
    res.status(500).json({ error: "Failed to extract scripts" });
  }
});

export default router;
