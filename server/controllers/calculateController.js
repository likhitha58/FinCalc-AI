const {
  calcEMI,
  calcCompoundInterest,
  calcSavingsGoal,
  calcSIPReturns,
  calcLoanEligibility,
} = require("../services/financialService");

// Helper to validate that a value is a finite, positive number
function requirePositive(val, name) {
  const n = Number(val);
  if (!isFinite(n) || n <= 0) throw new Error(`${name} must be a positive number.`);
  return n;
}

/**
 * POST /api/calculate/emi
 * Body: { principal, rate, years }
 */
function emi(req, res) {
  try {
    const principal = requirePositive(req.body.principal, "principal");
    const rate = requirePositive(req.body.rate, "rate");
    const years = requirePositive(req.body.years, "years");

    const result = calcEMI(principal, rate, years);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/calculate/compound-interest
 * Body: { principal, rate, years }
 */
function compoundInterest(req, res) {
  try {
    const principal = requirePositive(req.body.principal, "principal");
    const rate = requirePositive(req.body.rate, "rate");
    const years = requirePositive(req.body.years, "years");

    const result = calcCompoundInterest(principal, rate, years);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/calculate/savings-goal
 * Body: { goalAmount, months, rate? }
 */
function savingsGoal(req, res) {
  try {
    const goalAmount = requirePositive(req.body.goalAmount, "goalAmount");
    const months = requirePositive(req.body.months, "months");
    const rate = req.body.rate ? Number(req.body.rate) : 0;
    if (rate < 0) throw new Error("rate cannot be negative.");

    const result = calcSavingsGoal(goalAmount, months, rate);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/calculate/sip
 * Body: { monthly_investment, expected_return_rate, duration_years }
 */
function sipReturns(req, res) {
  try {
    const monthly_investment = requirePositive(req.body.monthly_investment, "monthly_investment");
    const expected_return_rate = requirePositive(req.body.expected_return_rate, "expected_return_rate");
    const duration_years = requirePositive(req.body.duration_years, "duration_years");

    const result = calcSIPReturns(monthly_investment, expected_return_rate, duration_years);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/calculate/loan-eligibility
 * Body: { monthly_income, rate, tenure_months, existing_emi? }
 */
function loanEligibility(req, res) {
  try {
    const monthly_income = requirePositive(req.body.monthly_income, "monthly_income");
    const rate = requirePositive(req.body.rate, "rate");
    const tenure_months = requirePositive(req.body.tenure_months, "tenure_months");
    const existing_emi = req.body.existing_emi ? Number(req.body.existing_emi) : 0;
    if (existing_emi < 0) throw new Error("existing_emi cannot be negative.");

    const result = calcLoanEligibility(monthly_income, rate, tenure_months, existing_emi);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = { emi, compoundInterest, savingsGoal, sipReturns, loanEligibility };
