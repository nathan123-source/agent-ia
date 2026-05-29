import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import {
  AnalyzeScriptBody,
  ScanRemotesBody,
  DiagnoseErrorBody,
  ProfileScriptBody,
  BuildGuiBody,
} from "@workspace/api-zod";

const router = Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");
  const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 65536,
      temperature: 0.3,
    },
  });
  return response.text || "";
}

router.post("/tools/analyze-script", async (req, res) => {
  try {
    const body = AnalyzeScriptBody.parse(req.body);

    const systemPrompt = `You are a Roblox Lua/LuaU expert code analyzer. Analyze scripts and return JSON with:
{
  "issues": ["list of bugs/errors found"],
  "optimizations": ["list of performance improvements"],
  "score": <0-100 quality score>,
  "fixedCode": "<complete corrected script>",
  "explanation": "<brief explanation of major changes>"
}
Rules: Be thorough, find nil access, missing task.wait(), memory leaks, deprecated APIs, infinite loops without yields, unclosed connections, missing pcall on remote calls. Always provide the complete fixed code.`;

    const response = await callGemini(
      systemPrompt,
      `Analyze this Roblox Lua script:\n\n\`\`\`lua\n${body.code}\n\`\`\``
    );

    let parsed;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch {
      parsed = {
        issues: ["Could not parse analysis"],
        optimizations: [],
        score: 50,
        fixedCode: body.code,
        explanation: response,
      };
    }

    res.json(parsed);
  } catch (err: any) {
    req.log.error({ err }, "Failed to analyze script");
    res.status(500).json({ error: err.message || "Failed to analyze script" });
  }
});

router.post("/tools/remote-scanner", async (req, res) => {
  try {
    const body = ScanRemotesBody.parse(req.body);

    const systemPrompt = `You are a Roblox reverse engineering expert. Scan Lua scripts for RemoteEvents and RemoteFunctions. Return JSON:
{
  "remotes": [
    {
      "name": "<remote name>",
      "type": "RemoteEvent|RemoteFunction",
      "path": "<game.path.to.remote>",
      "args": ["<arg1 type>", "<arg2 type>"],
      "bypassSuggestion": "<how to hook or monitor this remote>"
    }
  ],
  "suggestions": ["general bypass/monitoring suggestions"]
}`;

    const response = await callGemini(
      systemPrompt,
      `Scan this script for RemoteEvents/RemoteFunctions:\n\n\`\`\`lua\n${body.code}\n\`\`\``
    );

    let parsed;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch {
      parsed = { remotes: [], suggestions: [response] };
    }

    res.json(parsed);
  } catch (err: any) {
    req.log.error({ err }, "Failed to scan remotes");
    res.status(500).json({ error: err.message || "Failed to scan remotes" });
  }
});

router.post("/tools/error-diagnostic", async (req, res) => {
  try {
    const body = DiagnoseErrorBody.parse(req.body);

    const systemPrompt = `You are a Roblox executor error diagnostic expert. Analyze error logs and return JSON:
{
  "rootCause": "<what caused this error>",
  "fixedCode": "<complete corrected script with the error fixed>",
  "explanation": "<step-by-step explanation of root cause and fix>",
  "line": <line number where error occurred, or null>
}
Be specific about what went wrong and provide a complete, working fixed script.`;

    const userPrompt = `Error log:\n${body.errorLog}\n${
      body.originalCode ? `\nOriginal script:\n\`\`\`lua\n${body.originalCode}\n\`\`\`` : ""
    }`;

    const response = await callGemini(systemPrompt, userPrompt);

    let parsed;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch {
      parsed = {
        rootCause: "Could not parse diagnostic",
        fixedCode: body.originalCode || "",
        explanation: response,
        line: null,
      };
    }

    res.json(parsed);
  } catch (err: any) {
    req.log.error({ err }, "Failed to diagnose error");
    res.status(500).json({ error: err.message || "Failed to diagnose error" });
  }
});

router.post("/tools/profiler", async (req, res) => {
  try {
    const body = ProfileScriptBody.parse(req.body);

    const systemPrompt = `You are a Roblox performance profiler expert. Analyze scripts for performance issues. Return JSON:
{
  "issues": [
    {
      "type": "<InfiniteLoop|HeavyFunction|MissingYield|MemoryLeak|NilAccess|etc>",
      "description": "<what the issue is>",
      "line": <line number or null>,
      "severity": "critical|high|medium|low"
    }
  ],
  "optimizedCode": "<complete optimized version of the script>",
  "fpsImpact": "critical|high|medium|low",
  "warnings": ["general performance warnings"]
}`;

    const response = await callGemini(
      systemPrompt,
      `Profile this Roblox Lua script for performance:\n\n\`\`\`lua\n${body.code}\n\`\`\``
    );

    let parsed;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch {
      parsed = {
        issues: [],
        optimizedCode: body.code,
        fpsImpact: "unknown",
        warnings: [response],
      };
    }

    res.json(parsed);
  } catch (err: any) {
    req.log.error({ err }, "Failed to profile script");
    res.status(500).json({ error: err.message || "Failed to profile script" });
  }
});

router.post("/tools/gui-builder", async (req, res) => {
  try {
    const body = BuildGuiBody.parse(req.body);

    const style = body.style || "modern dark";
    const imageContext = body.imageBase64
      ? "\n[User provided a reference image of the GUI they want - analyze it and replicate the layout, colors, element positions, and style as accurately as possible]"
      : "";

    const systemPrompt = `You are an expert Roblox GUI developer. Build complete GUI systems using pure Roblox instances (ScreenGui, Frame, TextButton, TextLabel, ImageLabel, ScrollingFrame, etc.) — NOT libraries like Rayfield or Fluent unless specifically requested.

Return JSON with exactly these fields:
{
  "guiJson": "<JSON string representing the GUI tree structure with element types, sizes, positions, colors, text>",
  "luaCode": "<complete runnable Lua script that creates the full GUI>",
  "preview": "<HTML string for a visual preview of the GUI layout>"
}

Rules:
- luaCode must be complete and runnable in any executor
- Use UDim2.new() for sizes and positions
- Use Color3.fromRGB() for colors
- Add smooth tweening animations with TweenService
- Add draggable window functionality
- Add proper close/minimize buttons
- Use modern dark styling by default
- The Lua script must be complete — no placeholders`;

    const userPrompt = `Build a Roblox GUI: ${body.prompt}${imageContext}\nStyle: ${style}`;

    const response = await callGemini(systemPrompt, userPrompt);

    let parsed;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        const luaMatch = response.match(/```(?:lua|luau)\n?([\s\S]*?)```/);
        parsed = {
          guiJson: "{}",
          luaCode: luaMatch ? luaMatch[1].trim() : response,
          preview: "<div style='color:white;padding:10px'>GUI generated</div>",
        };
      }
    } catch {
      const luaMatch = response.match(/```(?:lua|luau)\n?([\s\S]*?)```/);
      parsed = {
        guiJson: "{}",
        luaCode: luaMatch ? luaMatch[1].trim() : response,
        preview: "<div style='color:white;padding:10px'>GUI generated</div>",
      };
    }

    res.json(parsed);
  } catch (err: any) {
    req.log.error({ err }, "Failed to build GUI");
    res.status(500).json({ error: err.message || "Failed to build GUI" });
  }
});

export default router;
