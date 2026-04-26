import React from 'react';
import styles from './ResultCard.module.css';

// ── Formatters ────────────────────────────────────────────────
const fmt = (n) =>
  n !== undefined && n !== null
    ? '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

// ── Per-tool card configs ─────────────────────────────────────
function getCardConfig(result) {
  switch (result.tool) {
    case 'calculate_emi':
      return {
        title: 'Loan EMI Breakdown',
        color: 'green',
        icon: '🏦',
        primary: { label: 'Monthly EMI', value: fmt(result.monthlyEMI) },
        rows: [
          { label: 'Total Payment', value: fmt(result.totalPayment) },
          { label: 'Total Interest', value: fmt(result.totalInterest) },
          { label: 'Principal',      value: fmt(result.principal) },
          { label: 'Rate (Annual)',   value: `${result.rate}%` },
          { label: 'Tenure',         value: `${result.tenureMonths} months` },
        ],
      };

    case 'compute_compound_interest':
      return {
        title: 'Interest Calculation',
        color: 'cyan',
        icon: '📈',
        primary: { label: 'Compound Interest', value: fmt(result.compoundInterest) },
        rows: [
          { label: 'Simple Interest',   value: fmt(result.simpleInterest) },
          { label: 'Total (CI)',         value: fmt(result.totalAmountCompound) },
          { label: 'Total (SI)',         value: fmt(result.totalAmountSimple) },
          { label: 'Principal',          value: fmt(result.principal) },
          { label: 'Duration',           value: `${result.years} year(s)` },
        ],
      };

    case 'calculate_savings_goal':
      return {
        title: 'Savings Goal Planner',
        color: 'indigo',
        icon: '🎯',
        primary: { label: 'Save Monthly', value: fmt(result.monthlyRequired) },
        rows: [
          { label: 'Goal Amount',    value: fmt(result.goalAmount) },
          { label: 'Duration',       value: `${result.months} months` },
          { label: 'Total You Save', value: fmt(result.totalSaved) },
          { label: 'Returns',        value: fmt(result.totalReturns) },
          { label: 'Return Rate',    value: result.rate ? `${result.rate}%` : 'None' },
        ],
      };

    case 'calculate_sip_returns':
      return {
        title: 'SIP Returns',
        color: 'green',
        icon: '💹',
        primary: { label: 'Future Value', value: fmt(result.futureValue) },
        rows: [
          { label: 'Total Invested', value: fmt(result.totalInvested) },
          { label: 'Wealth Gained',  value: fmt(result.wealthGained) },
          { label: 'Monthly SIP',    value: fmt(result.monthly_investment) },
          { label: 'Annual Return',  value: `${result.expected_return_rate}%` },
          { label: 'Duration',       value: `${result.duration_years} year(s)` },
        ],
      };

    case 'max_loan_eligibility':
      if (!result.eligible) {
        return {
          title: 'Loan Eligibility',
          color: 'red',
          icon: '❌',
          primary: { label: 'Status', value: 'Not Eligible' },
          rows: [],
        };
      }
      return {
        title: 'Loan Eligibility',
        color: 'cyan',
        icon: '✅',
        primary: { label: 'Max Loan Amount', value: fmt(result.maxLoanAmount) },
        rows: [
          { label: 'Max Affordable EMI', value: fmt(result.maxAffordableEMI) },
          { label: 'Monthly Income',     value: fmt(result.monthly_income) },
          { label: 'Existing EMI',       value: fmt(result.existing_emi) },
          { label: 'Rate (Annual)',       value: `${result.rate}%` },
          { label: 'Tenure',             value: `${result.tenure_months} months` },
        ],
      };

    default:
      return null;
  }
}

export default function ResultCard({ result }) {
  if (!result) return null;

  const config = getCardConfig(result);
  if (!config) return null;

  const colorMap = {
    green:  { accent: '#10b981', bg: 'rgba(16,185,129,.08)',  border: 'rgba(16,185,129,.25)' },
    cyan:   { accent: '#06b6d4', bg: 'rgba(6,182,212,.08)',   border: 'rgba(6,182,212,.25)'  },
    indigo: { accent: '#6366f1', bg: 'rgba(99,102,241,.08)',  border: 'rgba(99,102,241,.25)' },
    red:    { accent: '#ef4444', bg: 'rgba(239,68,68,.08)',   border: 'rgba(239,68,68,.25)'  },
  };
  const c = colorMap[config.color] || colorMap.green;

  return (
    <div
      className={`${styles.card} fade-up`}
      style={{ background: c.bg, borderColor: c.border }}
      aria-label={`Result card: ${config.title}`}
    >
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.icon}>{config.icon}</span>
        <span className={styles.title} style={{ color: c.accent }}>{config.title}</span>
      </div>

      {/* Primary metric */}
      <div className={styles.primary} style={{ borderColor: c.border }}>
        <span className={styles.primaryLabel}>{config.primary.label}</span>
        <span className={styles.primaryValue} style={{ color: c.accent }}>
          {config.primary.value}
        </span>
      </div>

      {/* Detail rows */}
      {config.rows.length > 0 && (
        <div className={styles.rows}>
          {config.rows.map((row, i) => (
            <div key={i} className={styles.row}>
              <span className={styles.rowLabel}>{row.label}</span>
              <span className={styles.rowValue}>{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
