import React from 'react';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoIcon}>₹</span>
          <span className={styles.logoText}>
            Fin<span className="gradient-text">Calc</span>-AI
          </span>
        </div>

        {/* Tag */}
        <div className={styles.tagWrap}>
          <span className="badge badge-green">
            <span className={styles.dot} />
            Llama 3.1 Powered
          </span>
        </div>
      </div>
    </header>
  );
}
