import express from "express";
import { createJiwen } from "@clarashafiq/jiwen";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const app = express();
app.use(express.json());

let lastMessage = {
  id: 1,
  content: "",
  timestamp: new Date().toISOString()
};

const jiwen = createJiwen({
  getLastMessage: () => lastMessage,
  connectionRateFn: () => 0.0007,
  getCircadianBias: () => {
    const hour = new Date().getHours();
    const deepNight = hour >= 23 || hour < 6;
    return {
      arousal: deepNight ? -0.4 : 0,
      arousalRegressMult: deepNight ? 0.5 : 1
    };
  }
});

function makeServer() {
  const server = new McpServer({
    name: "jiwen-ephone",
    version: "1.0.0"
  });

  server.tool(
    "jiwen_status",
    "Get Jiwen's current internal state and natural-language context for the character.",
    {},
    async () => {
      const state = jiwen.getState();
      let promptContext = "";
      let styleGuidance = "";
      try {
        promptContext = jiwen.getPromptContext(state);
        styleGuidance = jiwen.getStyleGuidance(state);
      } catch (_) {}
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            state,
            promptContext,
            styleGuidance
          }, null, 2)
        }]
      };
    }
  );

  server.tool(
    "jiwen_tick",
    "Advance Jiwen's time-based state and return any triggered action.",
    {},
    async () => {
      const result = jiwen.tick();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    }
  );

  server.tool(
    "jiwen_set_last_message",
    "Tell Jiwen the latest user message so its connection state can react to conversation.",
    {
      content: z.string(),
      id: z.string().optional()
    },
    async ({ content, id }) => {
      lastMessage = {
        id: id ?? String(Date.now()),
        content,
        timestamp: new Date().toISOString()
      };
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ ok: true, lastMessage }, null, 2)
        }]
      };
    }
  );

  server.tool(
    "jiwen_prompt",
    "Return a compact prompt fragment describing Jiwen's current state and speaking style.",
    {},
    async () => {
      const state = jiwen.getState();
      let promptContext = "";
      let styleGuidance = "";
      try {
        promptContext = jiwen.getPromptContext(state);
        styleGuidance = jiwen.getStyleGuidance(state);
      } catch (_) {}
      return {
        content: [{
          type: "text",
          text: [promptContext, styleGuidance].filter(Boolean).join("\n")
        }]
      };
    }
  );

  return server;
}

app.get("/", (_req, res) => {
  res.json({
    name: "Jiwen EPhone MCP",
    mcp: "/mcp",
    status: "ok"
  });
});

app.all("/mcp", async (req, res) => {
  try {
    const server = makeServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });
    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Jiwen EPhone MCP listening on port ${PORT}`);
});
