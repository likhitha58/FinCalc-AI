/**
 * MCP Router
 * Exposes the financial tool layer over REST so the Llama model (or any
 * orchestrator) can call tools via HTTP.
 *
 * POST /api/mcp/execute  — execute a single tool by name
 * GET  /api/mcp/tools    — list available tool schemas
 */

const express = require("express");
const { TOOL_SCHEMAS, executeTool } = require("./financialTools");

const router = express.Router();

// ── GET /api/mcp/tools ─────────────────────────────────────────
router.get("/tools", (_req, res) => {
  res.json({ tools: TOOL_SCHEMAS });
});

// ── POST /api/mcp/execute ─────────────────────────────────────
// Body: { "tool": "calculate_emi", "args": { "principal": 500000, "rate": 8, "years": 5 } }
router.post("/execute", (req, res) => {
  const { tool, args } = req.body;

  if (!tool) {
    return res.status(400).json({ error: "Missing required field: tool" });
  }
  if (!args || typeof args !== "object") {
    return res.status(400).json({ error: "Missing or invalid field: args (must be an object)" });
  }

  try {
    const result = executeTool(tool, args);
    return res.json({ success: true, tool, result });
  } catch (err) {
    console.error(`[MCP] Tool '${tool}' failed:`, err.message);
    return res.status(422).json({
      success: false,
      tool,
      error: err.message,
    });
  }
});

module.exports = router;
