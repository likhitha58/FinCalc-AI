const express = require("express");
const {
  emi,
  compoundInterest,
  savingsGoal,
  sipReturns,
  loanEligibility,
} = require("../controllers/calculateController");

const router = express.Router();

// POST /api/calculate/emi
router.post("/emi", emi);

// POST /api/calculate/compound-interest
router.post("/compound-interest", compoundInterest);

// POST /api/calculate/savings-goal
router.post("/savings-goal", savingsGoal);

// POST /api/calculate/sip
router.post("/sip", sipReturns);

// POST /api/calculate/loan-eligibility
router.post("/loan-eligibility", loanEligibility);

module.exports = router;
