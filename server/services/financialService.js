const { executeTool } = require("../mcp/financialTools");

/**
 * Direct financial calculation service (no LLM involved).
 * Used by the /api/calculate/* routes for deterministic results.
 */

function calcEMI(principal, rate, years) {
  return executeTool("calculate_emi", { principal, rate, years });
}

function calcCompoundInterest(principal, rate, years) {
  return executeTool("compute_compound_interest", { principal, rate, years });
}

function calcSavingsGoal(goalAmount, months, rate) {
  return executeTool("calculate_savings_goal", { goalAmount, months, rate });
}

function calcSIPReturns(monthly_investment, expected_return_rate, duration_years) {
  return executeTool("calculate_sip_returns", { monthly_investment, expected_return_rate, duration_years });
}

function calcLoanEligibility(monthly_income, rate, tenure_months, existing_emi) {
  return executeTool("max_loan_eligibility", { monthly_income, rate, tenure_months, existing_emi });
}

module.exports = {
  calcEMI,
  calcCompoundInterest,
  calcSavingsGoal,
  calcSIPReturns,
  calcLoanEligibility,
};
