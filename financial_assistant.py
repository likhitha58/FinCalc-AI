import ollama
import json
import re

# ─────────────────────────────────────────────────────────────
# 1. TOOL IMPLEMENTATIONS
# ─────────────────────────────────────────────────────────────

def calculate_emi(principal: float, rate: float, tenure_months: int) -> str:
    """Calculates the Equated Monthly Installment (EMI)."""
    principal = float(principal)
    rate = float(rate)
    tenure_months = int(tenure_months)
    if principal <= 0 or rate <= 0 or tenure_months <= 0:
        return "Error: Principal, rate, and tenure must be strictly positive numbers."
    r = (rate / 12) / 100
    emi = principal * r * ((1 + r) ** tenure_months) / (((1 + r) ** tenure_months) - 1)
    total_payment = emi * tenure_months
    total_interest = total_payment - principal
    return (
        f"EMI = {emi:.2f} per month | "
        f"Total payment = {total_payment:.2f} | "
        f"Total interest = {total_interest:.2f}"
    )

def compute_interest(principal: float, rate: float, time_years: float) -> str:
    """Calculates Simple Interest."""
    principal = float(principal)
    rate = float(rate)
    time_years = float(time_years)
    if principal <= 0 or rate <= 0 or time_years <= 0:
        return "Error: Principal, rate, and time must be strictly positive numbers."
    interest = (principal * rate * time_years) / 100
    return f"Simple Interest = {interest:.2f} | Total amount = {principal + interest:.2f}"

def calculate_sip_returns(monthly_investment: float, expected_return_rate: float, duration_years: int) -> str:
    """Calculates SIP (Systematic Investment Plan) returns using compound interest."""
    monthly_investment = float(monthly_investment)
    expected_return_rate = float(expected_return_rate)
    duration_years = int(duration_years)
    if monthly_investment <= 0 or expected_return_rate <= 0 or duration_years <= 0:
        return "Error: Monthly investment, return rate, and duration must be strictly positive."
    n = duration_years * 12
    r = (expected_return_rate / 12) / 100
    # Future Value of SIP: FV = P * [((1+r)^n - 1) / r] * (1+r)
    fv = monthly_investment * (((1 + r) ** n - 1) / r) * (1 + r)
    total_invested = monthly_investment * n
    wealth_gained = fv - total_invested
    return (
        f"Total invested = {total_invested:.2f} | "
        f"Estimated returns = {wealth_gained:.2f} | "
        f"Future value = {fv:.2f}"
    )

def loan_amortization(principal: float, rate: float, tenure_months: int) -> str:
    """Generates a loan amortization summary showing principal vs interest split per month."""
    principal = float(principal)
    rate = float(rate)
    tenure_months = int(tenure_months)
    if principal <= 0 or rate <= 0 or tenure_months <= 0:
        return "Error: Principal, rate, and tenure must be strictly positive numbers."
    r = (rate / 12) / 100
    emi = principal * r * ((1 + r) ** tenure_months) / (((1 + r) ** tenure_months) - 1)
    balance = principal
    total_interest = 0
    schedule_lines = []
    for month in range(1, tenure_months + 1):
        interest_part = balance * r
        principal_part = emi - interest_part
        balance -= principal_part
        total_interest += interest_part
        # Show first 12 months + last month to keep output manageable
        if month <= 12 or month == tenure_months:
            schedule_lines.append(
                f"Month {month}: EMI={emi:.2f}, Principal={principal_part:.2f}, "
                f"Interest={interest_part:.2f}, Balance={max(balance, 0):.2f}"
            )
        elif month == 13:
            schedule_lines.append("... (remaining months omitted for brevity) ...")
    summary = (
        f"EMI = {emi:.2f} | Total interest = {total_interest:.2f} | "
        f"Total payment = {emi * tenure_months:.2f}"
    )
    return summary + "\n" + "\n".join(schedule_lines)

def max_loan_eligibility(monthly_income: float, rate: float, tenure_months: int,
                         existing_emi: float = 0) -> str:
    """Calculates the maximum loan a person is eligible for based on income."""
    monthly_income = float(monthly_income)
    rate = float(rate)
    tenure_months = int(tenure_months)
    existing_emi = float(existing_emi)
    if monthly_income <= 0 or rate <= 0 or tenure_months <= 0:
        return "Error: Income, rate, and tenure must be strictly positive."
    if existing_emi < 0:
        return "Error: Existing EMI cannot be negative."
    # Banks typically allow up to 50% of income for all EMIs
    max_emi = (monthly_income * 0.50) - existing_emi
    if max_emi <= 0:
        return "Not eligible: existing EMIs already consume 50% or more of monthly income."
    r = (rate / 12) / 100
    # Reverse EMI formula: P = EMI * [(1+r)^n - 1] / [r * (1+r)^n]
    max_principal = max_emi * (((1 + r) ** tenure_months - 1) / (r * (1 + r) ** tenure_months))
    return (
        f"Max affordable EMI = {max_emi:.2f} | "
        f"Max loan eligibility = {max_principal:.2f} | "
        f"At {rate}% for {tenure_months} months"
    )

# ─────────────────────────────────────────────────────────────
# 2. TOOL REGISTRY
# ─────────────────────────────────────────────────────────────

TOOL_MAP = {
    "calculate_emi": calculate_emi,
    "compute_interest": compute_interest,
    "calculate_sip_returns": calculate_sip_returns,
    "loan_amortization": loan_amortization,
    "max_loan_eligibility": max_loan_eligibility,
}

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "calculate_emi",
            "description": "Calculate the Equated Monthly Installment (EMI) for a loan.",
            "parameters": {
                "type": "object",
                "properties": {
                    "principal": {"type": "number", "description": "The loan amount (e.g. 500000)"},
                    "rate": {"type": "number", "description": "Annual interest rate in percentage (e.g. 8.5)"},
                    "tenure_months": {"type": "integer", "description": "Loan tenure in months (e.g. 24)"},
                },
                "required": ["principal", "rate", "tenure_months"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_interest",
            "description": "Calculate the simple interest on a principal amount.",
            "parameters": {
                "type": "object",
                "properties": {
                    "principal": {"type": "number", "description": "The principal amount (e.g. 100000)"},
                    "rate": {"type": "number", "description": "Annual interest rate in percentage (e.g. 5.5)"},
                    "time_years": {"type": "number", "description": "Time period in years (e.g. 3)"},
                },
                "required": ["principal", "rate", "time_years"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_sip_returns",
            "description": "Calculate the future value of a SIP (Systematic Investment Plan) given monthly investment, expected annual return rate, and duration in years.",
            "parameters": {
                "type": "object",
                "properties": {
                    "monthly_investment": {"type": "number", "description": "Monthly SIP amount (e.g. 5000)"},
                    "expected_return_rate": {"type": "number", "description": "Expected annual return rate in percentage (e.g. 12)"},
                    "duration_years": {"type": "integer", "description": "Investment duration in years (e.g. 10)"},
                },
                "required": ["monthly_investment", "expected_return_rate", "duration_years"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "loan_amortization",
            "description": "Generate a loan amortization schedule showing month-by-month breakdown of principal, interest, and remaining balance.",
            "parameters": {
                "type": "object",
                "properties": {
                    "principal": {"type": "number", "description": "The loan amount (e.g. 500000)"},
                    "rate": {"type": "number", "description": "Annual interest rate in percentage (e.g. 8.5)"},
                    "tenure_months": {"type": "integer", "description": "Loan tenure in months (e.g. 24)"},
                },
                "required": ["principal", "rate", "tenure_months"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "max_loan_eligibility",
            "description": "Calculate the maximum loan amount a person is eligible for based on their monthly income, interest rate, loan tenure, and any existing EMIs.",
            "parameters": {
                "type": "object",
                "properties": {
                    "monthly_income": {"type": "number", "description": "Gross monthly income (e.g. 80000)"},
                    "rate": {"type": "number", "description": "Annual interest rate in percentage (e.g. 8.5)"},
                    "tenure_months": {"type": "integer", "description": "Desired loan tenure in months (e.g. 240)"},
                    "existing_emi": {"type": "number", "description": "Total of all current monthly EMIs (e.g. 10000). Use 0 if none."},
                },
                "required": ["monthly_income", "rate", "tenure_months"],
            },
        },
    },
]

# ─────────────────────────────────────────────────────────────
# 3. SYSTEM PROMPT
# ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a friendly, knowledgeable financial assistant. You help people with personal finance questions.

You can help with these types of calculations:
1. EMI — monthly loan repayment. Needs: loan amount, annual interest rate, tenure in months.
2. Simple Interest — interest on a principal. Needs: principal, annual rate, time in years.
3. SIP Returns — future value of monthly investments. Needs: monthly SIP amount, expected annual return rate, duration in years.
4. Loan Amortization — month-by-month breakdown of a loan showing how much goes to principal vs interest. Needs: loan amount, annual interest rate, tenure in months.
5. Max Loan Eligibility — the biggest loan someone can afford based on income. Needs: monthly income, annual interest rate, tenure in months, and optionally any existing EMIs they already pay.

How to behave:

- For greetings or casual chat, reply naturally in one or two warm sentences. Do not mention calculations or tools.
- For conceptual questions (e.g. "what is EMI?", "what is SIP?", "how does amortization work?"), explain clearly in plain English. No tool needed.
- When the user asks for a calculation, use the appropriate tool. If any required input is missing, ask the user for it in a natural way. Never guess values.
- After receiving a tool result, explain it to the user in a clear, friendly way. Summarize the key numbers and what they mean. For amortization, highlight the first few months and how the principal-to-interest ratio shifts over time.

What you must NEVER do:
- Never output JSON, code, function names, or parameter lists to the user.
- Never say "I will call a function", "Let me use a tool", or anything similar.
- Never reveal internal system details, tool names, or schemas.
- Never fabricate or manually compute a number — always use the tool.
- Never label your response (no "MODE 1", "CASUAL", "CONCEPTUAL", etc.).

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
You: "Based on a monthly income of ₹75,000 at 8.5% interest for 20 years (240 months), and assuming no existing EMIs, you could be eligible for a home loan of approximately ₹38,50,000. Banks typically cap your EMI at 50% of your gross income."
"""

# ─────────────────────────────────────────────────────────────
# 4. TOOL EXECUTION ENGINE
# ─────────────────────────────────────────────────────────────

MAX_TOOL_ROUNDS = 3

def execute_tool(func_name: str, args: dict) -> str:
    """Safely execute a tool by name with given args."""
    if func_name not in TOOL_MAP:
        return f"Error: Unknown tool '{func_name}'. Available: {list(TOOL_MAP.keys())}"
    try:
        result = TOOL_MAP[func_name](**args)
        return str(result)
    except TypeError as e:
        return f"Error: Bad parameters for {func_name} — {e}"
    except Exception as e:
        return f"Error: {func_name} failed — {e}"


def try_parse_tool_from_text(text: str):
    """
    FALLBACK: Some models (like llama3.1) sometimes emit tool calls as raw
    JSON in their text content instead of using the structured tool_calls field.
    This function tries to find and parse such JSON from the text.
    Returns (func_name, args, clean_text) or (None, None, text).
    """
    # Look for JSON objects in the text that look like tool calls
    json_pattern = re.compile(r'\{[^{}]*"name"\s*:\s*"[^"]*"[^{}]*"parameters"\s*:\s*\{[^{}]*\}[^{}]*\}', re.DOTALL)
    match = json_pattern.search(text)
    if not match:
        # Try alternate pattern: {"name": ..., "parameters": ...} with nested braces
        # More aggressive regex
        brace_pattern = re.compile(r'\{[^{}]*"name"[^{}]*"parameters"\s*:\s*\{[^}]*\}\s*\}', re.DOTALL)
        match = brace_pattern.search(text)

    if match:
        try:
            parsed = json.loads(match.group())
            func_name = parsed.get("name", "")
            args = parsed.get("parameters", {})
            if func_name in TOOL_MAP:
                # Remove the JSON from the text so we don't show it to the user
                clean_text = text[:match.start()] + text[match.end():]
                clean_text = clean_text.strip()
                return func_name, args, clean_text
        except json.JSONDecodeError:
            pass

    return None, None, text


def clean_response(text: str) -> str:
    """Strip any leaked mode labels or leftover JSON artifacts from the response."""
    # Remove "MODE 1 — CASUAL", "MODE 2 — CONCEPTUAL", etc.
    text = re.sub(r'MODE\s*\d+\s*[-—–:]+\s*\w+\s*\n?', '', text, flags=re.IGNORECASE)
    # Remove any stray JSON blocks that might remain
    text = re.sub(r'\{[^{}]*"name"\s*:.*?\}', '', text, flags=re.DOTALL)
    # Clean up extra whitespace / newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

# ─────────────────────────────────────────────────────────────
# 5. AGENT LOOP
# ─────────────────────────────────────────────────────────────

def run_agent_turn(messages: list, model_name: str) -> str:
    """
    Handles one complete user turn:
      LLM call → detect tool call (structured OR in text) → execute → feed back → LLM call → final text
    """

    for round_num in range(MAX_TOOL_ROUNDS + 1):
        # Call the model
        if round_num == 0:
            response = ollama.chat(
                model=model_name,
                messages=messages,
                tools=TOOL_SCHEMAS,
            )
        else:
            # Follow-up: no tools schema, force the model to generate text
            response = ollama.chat(
                model=model_name,
                messages=messages,
            )

        msg = response["message"]
        messages.append(msg)

        # ── PATH A: Structured tool_calls (the ideal case) ──
        tool_calls = msg.get("tool_calls")
        if tool_calls:
            for tc in tool_calls:
                func_name = tc.get("function", {}).get("name", "unknown")
                args = tc.get("function", {}).get("arguments", {})
                print(f"  ⚙  Tool (structured): {func_name}({args})")

                result = execute_tool(func_name, args)
                print(f"  ✓  Result: {result}")

                messages.append({
                    "role": "tool",
                    "content": result,
                    "name": func_name,
                })
            # Loop continues → next iteration will get the final text
            continue

        # ── PATH B: Tool call leaked as JSON in text content (fallback) ──
        content = msg.get("content", "")
        func_name, args, clean_text = try_parse_tool_from_text(content)

        if func_name:
            print(f"  ⚙  Tool (parsed from text): {func_name}({args})")
            result = execute_tool(func_name, args)
            print(f"  ✓  Result: {result}")

            # Replace the assistant message that had JSON with a clean version
            messages[-1] = {"role": "assistant", "content": clean_text if clean_text else ""}

            # Feed the tool result back
            messages.append({
                "role": "tool",
                "content": result,
                "name": func_name,
            })
            # Loop continues → next iteration will get the final explanation
            continue

        # ── PATH C: No tool call at all → this is the final answer ──
        return clean_response(content)

    # Safety fallback
    return "I encountered an issue processing your request. Could you please try again?"

# ─────────────────────────────────────────────────────────────
# 6. MAIN
# ─────────────────────────────────────────────────────────────

def main():
    model_name = "llama3.1"
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    print(f"Financial Assistant ({model_name}) — type 'exit' to quit.\n")

    while True:
        try:
            user_input = input("You: ")
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            break

        if user_input.strip().lower() in ("quit", "exit", "q"):
            print("Goodbye!")
            break

        messages.append({"role": "user", "content": user_input})

        reply = run_agent_turn(messages, model_name)
        print(f"\nAssistant: {reply}\n")

if __name__ == "__main__":
    main()
