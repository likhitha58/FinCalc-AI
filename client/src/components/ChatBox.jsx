import React, { useState, useEffect, useRef } from 'react';
import { sendMessage, clearSession } from '../services/api';
import ResultCard from './ResultCard';
import styles from './ChatBox.module.css';

// ── Suggestion chips ──────────────────────────────────────────
const SUGGESTIONS = [
  'What is my EMI for ₹5 lakh loan at 8% for 5 years?',
  'Compound interest on ₹1 lakh at 7% for 3 years?',
  'Monthly savings to buy a ₹6 lakh car in 2 years?',
  'SIP returns for ₹5000/month at 12% for 10 years?',
  'Max home loan I can get with ₹80,000 salary?',
];

const SESSION_ID = 'fincalc-session-' + Math.random().toString(36).slice(2, 9);

export default function ChatBox() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hey! 👋 I'm your AI financial assistant. Ask me anything — EMIs, SIPs, compound interest, savings goals, or loan eligibility. Just type naturally!",
      toolResult: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Clear session on unmount
  useEffect(() => () => clearSession(SESSION_ID).catch(() => {}), []);

  async function handleSend(text) {
    const query = (text || input).trim();
    if (!query || loading) return;

    setInput('');
    setError(null);

    const userMsg = { id: Date.now(), role: 'user', text: query, toolResult: null };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await sendMessage(query, SESSION_ID);
      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        text: data.reply,
        toolResult: data.toolResult || null,
        toolUsed: data.toolUsed || null,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClear() {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: "Cleared! 🗑️ Ready for your next financial question.",
        toolResult: null,
      },
    ]);
    setError(null);
    clearSession(SESSION_ID).catch(() => {});
  }

  return (
    <div className={styles.chatBox}>
      {/* ── Message List ────────────────────────────────────── */}
      <div className={styles.messageList} id="chat-message-list">
        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={`${styles.messageRow} ${msg.role === 'user' ? styles.userRow : styles.aiRow} fade-up`}
            style={{ animationDelay: `${idx * 0.03}s` }}
          >
            {/* Avatar */}
            {msg.role === 'assistant' && (
              <div className={styles.avatar} aria-label="AI">₹</div>
            )}

            <div className={styles.messageBubble}>
              {/* Tool badge */}
              {msg.toolUsed && (
                <span className={`badge badge-cyan ${styles.toolBadge}`}>
                  ⚙ {msg.toolUsed.replace(/_/g, ' ')}
                </span>
              )}

              {/* Text */}
              <p className={styles.messageText}>{msg.text}</p>

              {/* Result card */}
              {msg.toolResult && <ResultCard result={msg.toolResult} />}
            </div>

            {/* User avatar */}
            {msg.role === 'user' && (
              <div className={`${styles.avatar} ${styles.userAvatar}`} aria-label="You">
                You
              </div>
            )}
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div className={`${styles.messageRow} ${styles.aiRow} fade-up`}>
            <div className={styles.avatar}>₹</div>
            <div className={`${styles.messageBubble} ${styles.typingBubble}`}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className={`${styles.errorBanner} fade-up`} role="alert">
            <span>⚠️</span>
            <span>{error}</span>
            <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '.8rem' }} onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Suggestions ─────────────────────────────────────── */}
      {messages.length <= 1 && !loading && (
        <div className={styles.suggestions} aria-label="Suggested questions">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              id={`suggestion-${i}`}
              className={styles.suggestionChip}
              onClick={() => handleSend(s)}
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── Input Bar ───────────────────────────────────────── */}
      <div className={styles.inputBar}>
        <textarea
          ref={inputRef}
          id="chat-input"
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything about finance…"
          rows={1}
          disabled={loading}
          aria-label="Chat input"
        />

        <div className={styles.inputActions}>
          <button
            id="clear-chat-btn"
            className="btn btn-ghost"
            onClick={handleClear}
            disabled={loading}
            title="Clear conversation"
            aria-label="Clear conversation"
          >
            🗑
          </button>

          <button
            id="send-btn"
            className="btn btn-primary"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            {loading ? <span className="spinner" /> : '↑ Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
