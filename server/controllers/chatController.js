const { runAgentTurn } = require("../services/ollamaService");

// In-memory session store (replace with Redis for production multi-user)
const sessions = new Map();

/**
 * POST /api/chat
 * Body: { message: string, sessionId?: string }
 */
async function chat(req, res) {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Missing or empty 'message' field." });
  }

  const sid = sessionId || "default";

  // Retrieve or initialise conversation history
  if (!sessions.has(sid)) {
    sessions.set(sid, [
      {
        role: "system",
        content: require("../services/ollamaService").SYSTEM_PROMPT || "",
      },
    ]);
  }

  const history = sessions.get(sid);
  history.push({ role: "user", content: message.trim() });

  try {
    const { reply, toolUsed, toolResult, updatedMessages } = await runAgentTurn(history);
    
    // Replace the history with the fully updated conversation
    if (updatedMessages) {
      sessions.set(sid, updatedMessages);
    } else {
      history.push({ role: "assistant", content: reply });
    }

    return res.json({
      success: true,
      reply,
      toolUsed: toolUsed || null,
      toolResult: toolResult || null,
      sessionId: sid,
    });
  } catch (err) {
    console.error("[Chat Controller]", err.message);

    // Graceful degradation: tell user what's wrong
    if (err.message.includes("Ollama unreachable")) {
      return res.status(503).json({
        error:
          "The AI model is currently unavailable. Please make sure Ollama is running locally (`ollama serve`) and the llama3.1 model is pulled.",
      });
    }

    return res.status(500).json({ error: "An unexpected error occurred. Please try again." });
  }
}

/**
 * DELETE /api/chat/session/:sessionId
 * Clears conversation history for a given session.
 */
function clearSession(req, res) {
  const { sessionId } = req.params;
  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
    return res.json({ success: true, message: "Session cleared." });
  }
  return res.status(404).json({ error: "Session not found." });
}

module.exports = { chat, clearSession };
