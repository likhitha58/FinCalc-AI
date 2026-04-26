/**
 * MCP Financial Tool Implementations
 *
 * These mirror the Python functions in financial_assistant.py exactly
 * so that JS-side calculations match the LLM-assisted Python results.
 */

/**
 * Calculate EMI (Equated Monthly Installment)
 * @param {number} principal  - Loan amount in ₹
 * @param {number} rate       - Annual interest rate in %
 * @param {number} years      - Loan tenure in years  (converted to months internally)
 * @param {number} [tenureMonths] - Alternatively pass months directly
 */
function calculate_emi({ principal, rate, years, tenure_months }) {
  principal = Number(principal);
  rate = Number(rate);
  // Accept either years or tenure_months
  const months = tenure_months ? Number(tenure_months) : Number(years) * 12;

  if (principal <= 0 || rate <= 0 || months <= 0) {
    throw new Error("Principal, rate, and tenure must be strictly positive numbers.");
  }

  const r = rate / 12 / 100;
  const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const totalPayment = emi * months;
  const totalInterest = totalPayment - principal;

  return {
    tool: "calculate_emi",
    monthlyEMI: Math.round(emi * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    principal,
    rate,
    tenureMonths: months,
    summary: `EMI = ₹${emi.toFixed(2)}/month | Total payment = ₹${totalPayment.toFixed(2)} | Total interest = ₹${totalInterest.toFixed(2)}`,
  };
}

/**
 * Compute Simple Interest
 */
function compute_compound_interest({ principal, rate, years, time_years }) {
  principal = Number(principal);
  rate = Number(rate);
  const t = time_years ? Number(time_years) : Number(years);

  if (principal <= 0 || rate <= 0 || t <= 0) {
    throw new Error("Principal, rate, and time must be strictly positive numbers.");
  }

  // Simple interest (matches Python's compute_interest)
  const interest = (principal * rate * t) / 100;
  const totalAmount = principal + interest;

  // Also compute compound interest for extra insight
  const compoundAmount = principal * Math.pow(1 + rate / 100, t);
  const compoundInterest = compoundAmount - principal;

  return {
    tool: "compute_compound_interest",
    simpleInterest: Math.round(interest * 100) / 100,
    compoundInterest: Math.round(compoundInterest * 100) / 100,
    totalAmountSimple: Math.round(totalAmount * 100) / 100,
    totalAmountCompound: Math.round(compoundAmount * 100) / 100,
    principal,
    rate,
    years: t,
    summary: `Simple Interest = ₹${interest.toFixed(2)} | Compound Interest = ₹${compoundInterest.toFixed(2)} | Total (CI) = ₹${compoundAmount.toFixed(2)}`,
  };
}

/**
 * Calculate Monthly Savings Goal
 * @param {number} goalAmount - Target amount in ₹
 * @param {number} months     - Number of months to achieve it
 * @param {number} [rate]     - Optional annual interest/return rate (%)
 */
function calculate_savings_goal({ goalAmount, months, rate }) {
  goalAmount = Number(goalAmount);
  months = Number(months);
  rate = rate ? Number(rate) : 0;

  if (goalAmount <= 0 || months <= 0) {
    throw new Error("Goal amount and months must be strictly positive numbers.");
  }

  let monthlyRequired;
  if (rate > 0) {
    // Treat savings as a SIP: FV = P * [((1+r)^n - 1) / r] * (1+r)
    const r = rate / 12 / 100;
    monthlyRequired = (goalAmount * r) / (((1 + r) ** months - 1) * (1 + r));
  } else {
    monthlyRequired = goalAmount / months;
  }

  const totalSaved = monthlyRequired * months;
  const totalReturns = goalAmount - totalSaved;

  return {
    tool: "calculate_savings_goal",
    monthlyRequired: Math.round(monthlyRequired * 100) / 100,
    totalSaved: Math.round(totalSaved * 100) / 100,
    totalReturns: Math.max(0, Math.round(totalReturns * 100) / 100),
    goalAmount,
    months,
    rate,
    summary: `Monthly savings needed = ₹${monthlyRequired.toFixed(2)} | Over ${months} months to reach ₹${goalAmount.toFixed(2)}`,
  };
}

/**
 * Calculate SIP Returns (matches Python's calculate_sip_returns)
 */
function calculate_sip_returns({ monthly_investment, expected_return_rate, duration_years }) {
  monthly_investment = Number(monthly_investment);
  expected_return_rate = Number(expected_return_rate);
  duration_years = Number(duration_years);

  if (monthly_investment <= 0 || expected_return_rate <= 0 || duration_years <= 0) {
    throw new Error("Monthly investment, return rate, and duration must be strictly positive.");
  }

  const n = duration_years * 12;
  const r = expected_return_rate / 12 / 100;
  const fv = monthly_investment * (((1 + r) ** n - 1) / r) * (1 + r);
  const totalInvested = monthly_investment * n;
  const wealthGained = fv - totalInvested;

  return {
    tool: "calculate_sip_returns",
    futureValue: Math.round(fv * 100) / 100,
    totalInvested: Math.round(totalInvested * 100) / 100,
    wealthGained: Math.round(wealthGained * 100) / 100,
    monthly_investment,
    expected_return_rate,
    duration_years,
    summary: `Total invested = ₹${totalInvested.toFixed(2)} | Estimated returns = ₹${wealthGained.toFixed(2)} | Future value = ₹${fv.toFixed(2)}`,
  };
}

/**
 * Calculate Max Loan Eligibility
 */
function max_loan_eligibility({ monthly_income, rate, tenure_months, existing_emi }) {
  monthly_income = Number(monthly_income);
  rate = Number(rate);
  tenure_months = Number(tenure_months);
  existing_emi = existing_emi ? Number(existing_emi) : 0;

  if (monthly_income <= 0 || rate <= 0 || tenure_months <= 0) {
    throw new Error("Income, rate, and tenure must be strictly positive.");
  }
  if (existing_emi < 0) {
    throw new Error("Existing EMI cannot be negative.");
  }

  const maxEMI = monthly_income * 0.5 - existing_emi;
  if (maxEMI <= 0) {
    return {
      tool: "max_loan_eligibility",
      eligible: false,
      summary: "Not eligible: existing EMIs already consume 50% or more of monthly income.",
    };
  }

  const r = rate / 12 / 100;
  const maxPrincipal = maxEMI * (((1 + r) ** tenure_months - 1) / (r * (1 + r) ** tenure_months));

  return {
    tool: "max_loan_eligibility",
    eligible: true,
    maxAffordableEMI: Math.round(maxEMI * 100) / 100,
    maxLoanAmount: Math.round(maxPrincipal * 100) / 100,
    monthly_income,
    rate,
    tenure_months,
    existing_emi,
    summary: `Max affordable EMI = ₹${maxEMI.toFixed(2)} | Max loan eligibility = ₹${maxPrincipal.toFixed(2)} | At ${rate}% for ${tenure_months} months`,
  };
}

// ── Tool registry ──────────────────────────────────────────────
const TOOL_MAP = {
  calculate_emi,
  compute_compound_interest,
  calculate_savings_goal,
  calculate_sip_returns,
  max_loan_eligibility,
};

// ── MCP Tool Schemas (for LLM tool-calling) ───────────────────
const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "calculate_emi",
      description: "Calculate the Equated Monthly Installment (EMI) for a loan.",
      parameters: {
        type: "object",
        properties: {
          principal: { type: "number", description: "The loan amount in ₹ (e.g. 500000)" },
          rate: { type: "number", description: "Annual interest rate in % (e.g. 8)" },
          years: { type: "number", description: "Loan tenure in years (e.g. 5)" },
        },
        required: ["principal", "rate", "years"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compute_compound_interest",
      description: "Calculate simple and compound interest on a principal amount.",
      parameters: {
        type: "object",
        properties: {
          principal: { type: "number", description: "The principal amount in ₹ (e.g. 100000)" },
          rate: { type: "number", description: "Annual interest rate in % (e.g. 7)" },
          years: { type: "number", description: "Time period in years (e.g. 3)" },
        },
        required: ["principal", "rate", "years"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_savings_goal",
      description: "Calculate how much to save monthly to reach a financial goal.",
      parameters: {
        type: "object",
        properties: {
          goalAmount: { type: "number", description: "Target savings goal in ₹ (e.g. 500000)" },
          months: { type: "number", description: "Number of months to achieve the goal (e.g. 24)" },
          rate: { type: "number", description: "Optional annual return rate % if investing savings (e.g. 8)" },
        },
        required: ["goalAmount", "months"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_sip_returns",
      description: "Calculate future value of a SIP (Systematic Investment Plan).",
      parameters: {
        type: "object",
        properties: {
          monthly_investment: { type: "number", description: "Monthly SIP amount in ₹ (e.g. 5000)" },
          expected_return_rate: { type: "number", description: "Expected annual return rate in % (e.g. 12)" },
          duration_years: { type: "number", description: "Investment duration in years (e.g. 10)" },
        },
        required: ["monthly_investment", "expected_return_rate", "duration_years"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "max_loan_eligibility",
      description: "Calculate the maximum loan amount a person is eligible for based on income.",
      parameters: {
        type: "object",
        properties: {
          monthly_income: { type: "number", description: "Gross monthly income in ₹ (e.g. 80000)" },
          rate: { type: "number", description: "Annual interest rate in % (e.g. 8.5)" },
          tenure_months: { type: "number", description: "Loan tenure in months (e.g. 240)" },
          existing_emi: { type: "number", description: "Total current monthly EMIs in ₹ (use 0 if none)" },
        },
        required: ["monthly_income", "rate", "tenure_months"],
      },
    },
  },
];

/**
 * Execute a tool by name with given args.
 */
function executeTool(toolName, args) {
  const fn = TOOL_MAP[toolName];
  if (!fn) {
    throw new Error(`Unknown tool '${toolName}'. Available: ${Object.keys(TOOL_MAP).join(", ")}`);
  }
  return fn(args);
}

module.exports = { TOOL_MAP, TOOL_SCHEMAS, executeTool };
