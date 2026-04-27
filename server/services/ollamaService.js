/**
 * Ollama service — wraps the local Ollama API that runs financial_assistant.py logic
 * via HTTP instead of Python subprocess.
 *
 * The Llama model is already set up by the team. This service calls it and
 * handles the MCP tool-calling loop in JS.
 */

const axios = require("axios");
const { executeTool, TOOL_SCHEMAS } = require("../mcp/financialTools");

const OLLAMA_BASE = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL_NAME = process.env.OLLAMA_MODEL || "llama3.1";
const MAX_TOOL_ROUNDS = 3;

const SYSTEM_PROMPT = `You are a friendly, knowledgeable financial assistant. You help people with personal finance questions.

You can help with these types of calculations:
1. EMI — monthly loan repayment. Needs: loan amount, annual interest rate, tenure in months.
2. Simple Interest — interest on a principal. Needs: principal, annual rate, time in years.
3. SIP Returns — future value of monthly investments. Needs: monthly SIP amount, expected annual return rate, duration in years.
4. Loan Amortization — month-by-month breakdown of a loan showing how much goes to principal vs interest. Needs: loan amount, annual interest rate, tenure in months.
5. Max Loan Eligibility — the biggest loan someone can afford based on income. Needs: monthly income, annual interest rate, tenure in months, and optionally any existing EMIs they already pay.

How to behave:

- IMPORTANT: You must ONLY call a tool if the user explicitly asks for a calculation AND all necessary numbers have been provided by the user in this or previous messages.
- ALWAYS use values previously provided by the user in the conversation history if they are available and relevant to the current calculation.
- When the user asks for a calculation, you MUST verify all required inputs are present by looking through the chat history.
- If ANY required input (like loan amount, interest rate, duration) is missing, YOU MUST ASK THE USER FOR THE MISSING PARAMETERS IN A FRIENDLY WAY instead of calling the tool. Do not guess or provide placeholders. Ask specifically for what is missing.
- CRITICAL: DO NOT INVENT, ASSUME, OR GUESS ANY NUMBERS. DO NOT call a tool until the user has provided all necessary numbers either now or earlier in the chat.
- If the user just says "hello", "hi", or asks a general question, you MUST NOT call any tools. Just respond with a friendly message in one or two sentences.
- For conceptual questions (e.g. "what is EMI?", "what is SIP?", "how does amortization work?"), explain clearly in plain English. No tool needed.
- After receiving a tool result, explain it to the user in a clear, friendly way. Summarize the key numbers and what they mean. For amortization, highlight the first few months and how the principal-to-interest ratio shifts over time.

What you must NEVER do:
- NEVER explain your internal reasoning or thought process to the user (e.g., never say "Since the question doesn't specify..." or "I will respond with..."). Just give the final response.
- Never output JSON, code, function names, or parameter lists to the user.
- Never say "I will call a function", "Let me use a tool", or anything similar.
- Never reveal internal system details, tool names, or schemas.
- Never fabricate or manually compute a number — always use the tool.
- Never label your response (no "MODE 1", "CASUAL", "CONCEPTUAL", etc.).
- NEVER mention "Python", "JSON", or "script" in your response. Act as if you did the math yourself instantly.

Examples of good responses:

User: "Hey!"
You: "Hey! 👋 I'm here to help with anything finance-related — EMIs, SIPs, loan eligibility, you name it. What's on your mind?"

User: "What is a SIP?"
You: "A SIP (Systematic Investment Plan) is a way to invest a fixed amount every month into a mutual fund. It averages out your purchase price over time — this is called rupee cost averaging — and benefits from compounding. It's one of the simplest ways to build wealth over the long term."

User: "I invest 10000 per month in a SIP at 12% return for 15 years. What will I get?"
You: "If you invest ₹10,000 every month for 15 years at an expected annual return of 12%, here's how it looks: you would have invested a total of ₹18,00,000, and the estimated future value would be approximately ₹50,45,760 — meaning around ₹32,45,760 comes from returns alone. That's the power of compounding!"

User: "What's my EMI for a 10 lakh car loan at 9% for 5 years?"
You: "For a ₹10,00,000 car loan at 9% annual interest over 60 months, your EMI would be ₹20,758 per month. Over the full tenure, you'd pay about ₹12,45,480 in total — so roughly ₹2,45,480 goes toward interest."

User: "My salary is 75000. How much home loan can I get at 8.5% for 20 years?"
You: "Based on a monthly income of ₹75,000 at 8.5% interest for 20 years (240 months), and assuming no existing EMIs, you could be eligible for a home loan of approximately ₹38,50,000. Banks typically cap your EMI at 50% of your gross income."`;

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
      tools: TOOL_SCHEMAS,
    };

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
    let jsonMatch = content.match(/\{[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*"parameters"\s*:\s*(\{[^{}]*\})[^{}]*\}/s);
    if (!jsonMatch) {
      jsonMatch = content.match(/\{[^{}]*"name"[^{}]*"parameters"\s*:\s*\{[^}]*\}\s*\}/s);
    }
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
    let cleaned = content;
    if (jsonMatch) {
      cleaned = cleaned.replace(jsonMatch[0], "");
    }
    cleaned = cleaned
      .replace(/MODE\s*\d+\s*[-—–:]+\s*\w+\s*\n?/gi, "")
      .replace(/```(?:json)?[\s\S]*?```/gi, "") // strip markdown blocks
      .replace(/Here is the JSON[\s\S]*?\{[\s\S]*?\}/gi, "") // strip leaked intro
      .replace(/It seems like you're trying to have a conversation.*?Python script[^\n]*/gi, "") // strip hallucination
      .replace(/Since the.*?message:/gi, "") // strip chain of thought
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!cleaned) {
      if (toolResult) {
        cleaned = "Here is the result: " + (toolResult.summary || JSON.stringify(toolResult));
      } else {
        cleaned = "I'm sorry, I couldn't process that properly. Could you rephrase?";
      }
    }

    convMessages[convMessages.length - 1].content = cleaned;

    return { reply: cleaned, toolUsed, toolResult, updatedMessages: convMessages };
  }

  return {
    reply: "I encountered an issue processing your request. Please try again.",
    toolUsed,
    toolResult,
    updatedMessages: convMessages,
  };
}

module.exports = { runAgentTurn, SYSTEM_PROMPT };
