import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90000, // 90s — LLM can be slow
  headers: { 'Content-Type': 'application/json' },
});

// ── Interceptors ──────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ||
      err.message ||
      'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);

// ── Chat ──────────────────────────────────────────────────────
export const sendMessage = (message, sessionId) =>
  api.post('/chat', { message, sessionId }).then((r) => r.data);

export const clearSession = (sessionId) =>
  api.delete(`/chat/session/${sessionId}`).then((r) => r.data);

// ── Direct Calculations ───────────────────────────────────────
export const calculateEMI = (principal, rate, years) =>
  api.post('/calculate/emi', { principal, rate, years }).then((r) => r.data);

export const calculateCompoundInterest = (principal, rate, years) =>
  api.post('/calculate/compound-interest', { principal, rate, years }).then((r) => r.data);

export const calculateSavingsGoal = (goalAmount, months, rate) =>
  api.post('/calculate/savings-goal', { goalAmount, months, rate }).then((r) => r.data);

export const calculateSIP = (monthly_investment, expected_return_rate, duration_years) =>
  api.post('/calculate/sip', { monthly_investment, expected_return_rate, duration_years }).then((r) => r.data);

export const calculateLoanEligibility = (monthly_income, rate, tenure_months, existing_emi) =>
  api.post('/calculate/loan-eligibility', { monthly_income, rate, tenure_months, existing_emi }).then((r) => r.data);

export default api;
