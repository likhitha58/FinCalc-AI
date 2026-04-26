import React from 'react';
import ChatBox from '../components/ChatBox';
import styles from './Home.module.css';

export default function Home() {
  return (
    <div className={styles.home}>
      {/* ── Hero header ──────────────────────────────────────── */}
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Ask anything about{' '}
          <span className="gradient-text">your money</span>
        </h1>
        <p className={styles.heroSub}>
          Powered by Llama 3.1 + MCP tool calling — just type naturally.
        </p>
      </div>

      {/* ── Chat ─────────────────────────────────────────────── */}
      <ChatBox />
    </div>
  );
}
