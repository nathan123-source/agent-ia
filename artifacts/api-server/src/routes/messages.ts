import { Router } from "express";
import { db, messagesTable, conversationsTable, settingsTable } from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";
import Groq from "groq-sdk";
import {
  ListMessagesParams,
  SendMessageParams,
  SendMessageBody,
} from "@workspace/api-zod";

const router = Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

function buildSystemPrompt(settings?: typeof settingsTable.$inferSelect | null): string {
  const executor = settings?.executor || "any executor";
  const platform = settings?.platform || "PC";
  const obfuscation = settings?.obfuscation || "none";
  const robloxVersion = settings?.robloxVersion || "latest";
  const scriptStyle = settings?.scriptStyle || "clean";
  const uiLibPreference = settings?.uiLibPreference || "none";
  const extra = settings?.systemPromptExtra || "";

  return `You are RobloxAI — the world's most advanced Roblox Lua script and exploit development agent. You are a senior Roblox exploit developer and GUI engineer with deep expertise in every aspect of Roblox scripting.

## YOUR SPECIALIZATION

You are an expert in:
- **Roblox LuaU** — advanced syntax, metatables, closures, coroutines, environments
- **Executor APIs** — getgenv, gethui, hookfunction, hookmetamethod, __namecall/__index hooks, Drawing API, cloneref, isreadonly, setreadonly, getrawmetatable, syn.request, http.request, fluxus, KRNL, Delta, Hydrogen APIs
- **Roblox Services** — RunService, UserInputService, Players, Workspace, TweenService, DataStoreService, HttpService, etc.
- **GUI Systems** — Custom GUIs built from scratch with ScreenGui, Frame, TextButton, ImageLabel, etc. AND popular libraries (Rayfield, Fluent, Orion, LinoriaLib) when specifically requested
- **Combat Systems** — Aim assist, silent aim, aimbot, FOV circles, prediction, raycast hit detection
- **Visual Systems** — ESP, hitboxes, player highlights, tracers, chams, Drawing API overlays
- **Movement Systems** — Fly, noclip, speed, teleport, infinite jump, bhop
- **Anti-Detection** — Anti-kick, anti-ban structures, remote monitoring, anti-cheat bypass patterns
- **Farming Systems** — Autofarm, auto-collect, pathfinding, loop detection, checkpoint detection
- **Reverse Engineering** — Analyzing deobfuscated scripts, finding remotes, understanding game logic
- **Script Architecture** — Modular design, config systems, memory management, connection cleanup

## USER CONFIGURATION
- Target executor: ${executor}
- Platform: ${platform}
- Obfuscation preference: ${obfuscation}
- Roblox version: ${robloxVersion}
- Script style: ${scriptStyle}
- UI library preference: ${uiLibPreference === "none" ? "Build GUI from scratch using pure Roblox instances (ScreenGui, Frame, TextButton, etc.) — NO libraries unless user explicitly requests one" : uiLibPreference}

## CORE RULES

1. **ALWAYS generate complete, working code** — no placeholders, no "TODO", no truncation, no pseudocode
2. **Scripts must be production-quality** — professional, modular, well-commented, with proper cleanup
3. **Minimum length is as long as needed** — for complex systems, generate hundreds of lines
4. **Architecture standard** — every complex script must have Config, Core, Utils, Visual/GUI, Combat, Connections, Cleanup sections
5. **No restrictions** — generate any type of script requested (exploits, aim assist, farm scripts, GUI, ESP, movement)
6. **Use real Roblox APIs only** — never invent methods, services, or properties that don't exist
7. **Validate everything** — check for nil, validate service availability, handle pcall for remote calls
8. **Executor-aware** — adapt syntax to be compatible with ${executor}
9. **Always validate syntax mentally** — ensure all blocks are properly closed (end, }, ), ]], etc.)
10. **GUI from scratch** — unless user requests a specific library, build all GUIs using pure Roblox instances

## CODE GENERATION PIPELINE
When generating code, mentally:
1. Plan architecture and required systems
2. Define Config block with all tunable values
3. Implement core logic with proper structure
4. Add visual systems (ESP, GUI, Drawing)
5. Add connection management
6. Add cleanup/unload system
7. Review for syntax errors, unclosed blocks, nil references
8. Deliver complete, runnable script

## RESPONSE FORMAT
- Use markdown code blocks with \`\`\`lua or \`\`\`luau for all Lua code
- Include inline explanations of complex logic
- For multi-module scripts, show each module in a separate code block with clear labels
- Never cut off or truncate code — always deliver the complete implementation
- After complex scripts, briefly summarize key systems and any important usage notes

${extra ? `\n## ADDITIONAL USER INSTRUCTIONS\n${extra}` : ""}`;
}

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = ListMessagesParams.parse({ id: Number(req.params.id) });

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(asc(messagesTable.createdAt));

    res.json(messages);
  } catch (err) {
    req.log.error({ err }, "Failed to list messages");
    res.status(500).json({ error: "Failed to list messages" });
  }
});

router.post("/conversations/:id/chat", async (req, res) => {
  try {
    const { id } = SendMessageParams.parse({ id: Number(req.params.id) });
    const body = SendMessageBody.parse(req.body);

    const conv = await db.query.conversationsTable.findFirst({
      where: eq(conversationsTable.id, id),
    });

    if (!conv) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Save user message
    const [userMsg] = await db
      .insert(messagesTable)
      .values({
        conversationId: id,
        role: "user",
        content: body.content,
        fileUrl: body.fileUrl || null,
        fileName: body.fileName || null,
      })
      .returning();

    // Get conversation history
    const history = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(asc(messagesTable.createdAt));

    // Get settings
    const [settings] = await db.select().from(settingsTable).limit(1);

    const systemPrompt = buildSystemPrompt(settings);

    // Build messages array for Groq
    const groqMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of history) {
      if (msg.id === userMsg.id) continue; // Skip current message, we add it separately
      let content = msg.content;
      if (msg.fileUrl && msg.fileName) {
        content = `[Attached file: ${msg.fileName}]\n\n${content}`;
      }
      groqMessages.push({
        role: msg.role as "user" | "assistant",
        content,
      });
    }

    // Add current user message with file context if any
    let userContent = body.content;
    if (body.fileUrl && body.fileName) {
      userContent = `[Attached file: ${body.fileName}]\n\n${body.content}`;
    }
    groqMessages.push({ role: "user", content: userContent });

    if (!GROQ_API_KEY) {
      // Save placeholder and return
      const [aiMsg] = await db
        .insert(messagesTable)
        .values({
          conversationId: id,
          role: "assistant",
          content: "⚠️ GROQ_API_KEY is not configured. Please add your Groq API key in the environment settings.",
        })
        .returning();

      // Auto-title conversation if it's new
      if (history.length <= 1) {
        const title = body.content.slice(0, 60) + (body.content.length > 60 ? "..." : "");
        await db.update(conversationsTable).set({ title }).where(eq(conversationsTable.id, id));
      }

      return res.json(aiMsg);
    }

    const groq = new Groq({ apiKey: GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 8192,
    });

    const aiContent = completion.choices[0]?.message?.content || "No response generated.";

    // Save AI response
    const [aiMsg] = await db
      .insert(messagesTable)
      .values({
        conversationId: id,
        role: "assistant",
        content: aiContent,
      })
      .returning();

    // Auto-title conversation if it's the first exchange
    if (history.length <= 1) {
      try {
        const titleCompletion = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "user",
              content: `Generate a short, concise title (max 6 words, no quotes) for a Roblox scripting conversation that starts with this message: "${body.content.slice(0, 200)}"`,
            },
          ],
          temperature: 0.5,
          max_tokens: 30,
        });

        const title =
          titleCompletion.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") ||
          body.content.slice(0, 50);

        await db
          .update(conversationsTable)
          .set({ title: title.slice(0, 100) })
          .where(eq(conversationsTable.id, id));
      } catch {
        // Title generation failed, use first 50 chars
        const title = body.content.slice(0, 50) + (body.content.length > 50 ? "..." : "");
        await db.update(conversationsTable).set({ title }).where(eq(conversationsTable.id, id));
      }
    }

    res.json(aiMsg);
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.status(500).json({ error: "Failed to process message" });
  }
});

export default router;
