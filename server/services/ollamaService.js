/**
 * Ollama service — wraps the local Ollama API that runs financial_assistant.py logic
 * via HTTP instead of Python subprocess.
 *
 * The Llama model is already set up by the team. This service calls it and
 * handles the MCP tool-calling loop in JS.
 */

const axios = require("axios");
const { executeTool, TOOL_SCHEMAS } = require("../mcp/financialTools");

const OLLAMA_BASE = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL_NAME = process.env.OLLAMA_MODEL || "llama3.1";
const MAX_TOOL_ROUNDS = 3;

const SYSTEM_PROMPT = `You are a friendly, knowledgeable financial assistant. You help people with personal finance questions.

You can help with these types of calculations:
1. EMI — monthly loan repayment. Needs: loan amount, annual interest rate, tenure in years.
2. Simple/Compound Interest — interest on a principal. Needs: principal, annual rate, time in years.
3. SIP Returns — future value of monthly investments. Needs: monthly SIP amount, expected annual return rate, duration in years.
4. Savings Goal — monthly savings required to hit a target amount. Needs: goal amount, months available, optional return rate.
5. Max Loan Eligibility — biggest loan someone can afford based on income. Needs: monthly income, annual interest rate, tenure in months, and optionally any existing EMIs.

How to behave:
- For greetings or casual chat, reply naturally in one or two warm sentences.
- For conceptual questions (e.g. "what is EMI?"), explain clearly in plain English. No tool needed.
- When the user asks for a calculation, use the appropriate tool. If any required input is missing, ask for it naturally. Never guess values.
- After receiving a tool result, explain it to the user in a clear, friendly way. Summarize the key numbers and what they mean.

What you must NEVER do:
- Never output JSON, code, function names, or parameter lists to the user.
- Never say "I will call a function" or "Let me use a tool".
- Never fabricate or manually compute a number — always use the tool.`;

/**
 * Run one full agent turn: LLM → tool call → LLM → final text
 * @param {Array} messages  - Full conversation history
 * @returns {{ reply: string, toolUsed: string|null, toolResult: object|null }}
 */
async function runAgentTurn(messages) {
  let toolUsed = null;
  let toolResult = null;

  const convMessages = [...messages];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const body = {
      model: MODEL_NAME,
      messages: convMessages,
      stream: false,
    };

    // Only pass tools on the first round so the model can decide to call one
    if (round === 0) {
      body.tools = TOOL_SCHEMAS;
    }

    let response;
    try {
      response = await axios.post(`${OLLAMA_BASE}/api/chat`, body, {
        timeout: 60000,
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      throw new Error(`Ollama unreachable: ${msg}`);
    }

    const msg = response.data.message;
    convMessages.push(msg);

    // ── Structured tool_calls ──────────────────────────────────
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const tc of msg.tool_calls) {
        const fnName = tc.function?.name;
        const args = tc.function?.arguments || {};
        console.log(`  ⚙  Tool (structured): ${fnName}(${JSON.stringify(args)})`);

        const result = executeTool(fnName, args);
        toolUsed = fnName;
        toolResult = result;
        console.log(`  ✓  Result: ${JSON.stringify(result)}`);

        convMessages.push({ role: "tool", content: JSON.stringify(result), name: fnName });
      }
      continue; // Next round → get final explanation
    }

    // ── Fallback: JSON leaked in text ─────────────────────────
    const content = msg.content || "";
    const jsonMatch = content.match(/\{[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*"parameters"\s*:\s*(\{[^{}]*\})[^{}]*\}/s);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const fnName = parsed.name;
        const args = parsed.parameters || {};
        const result = executeTool(fnName, args);
        toolUsed = fnName;
        toolResult = result;

        const cleanText = content.replace(jsonMatch[0], "").trim();
        convMessages[convMessages.length - 1] = { role: "assistant", content: cleanText };
        convMessages.push({ role: "tool", content: JSON.stringify(result), name: fnName });
        continue;
      } catch (_) { /* fall through */ }
    }

    // ── Final text answer ─────────────────────────────────────
    const cleaned = content
      .replace(/MODE\s*\d+\s*[-—–:]+\s*\w+\s*\n?/gi, "")
      .replace(/\{[^{}]*"name"\s*:.*?\}/gs, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return { reply: cleaned, toolUsed, toolResult };
  }

  return {
    reply: "I encountered an issue processing your request. Please try again.",
    toolUsed,
    toolResult,
  };
}

module.exports = { runAgentTurn };
