const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const chatRoutes = require("./routes/chat");
const calculateRoutes = require("./routes/calculate");
const mcpRoutes = require("./mcp/mcpRouter");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());
app.use(morgan("dev"));

// ── Routes ───────────────────────────────────────────────────
app.use("/api/chat", chatRoutes);
app.use("/api/calculate", calculateRoutes);
app.use("/api/mcp", mcpRoutes);

// ── Health check ─────────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ error: "Route not found" })
);

// ── Global error handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[Global Error]", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

app.listen(PORT, () =>
  console.log(`🚀 FinCalc-AI backend running on http://localhost:${PORT}`)
);

module.exports = app;
