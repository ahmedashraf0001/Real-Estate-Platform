import styles from './loading.module.css';
import { Sparkles } from 'lucide-react';

export default function Loading() {
  return (
    <div className={styles.loadingWrapper}>
      <div className={styles.ambientGlow} />
      <div className={styles.loadingCard}>
        <div className={styles.logoHaloWrap}>
          <div className={styles.haloRing} />
          <div className={styles.haloGlow} />
          <div className={styles.logoBadge}>ZF</div>
        </div>
        <div className={styles.textWrap}>
          <span className={styles.brandTitle}>Zakaria Farid</span>
          <span className={styles.brandSubtitle}>
            <Sparkles size={11} className={styles.sparkleIcon} />
            Luxury Real Estate
          </span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} />
        </div>
      </div>
    </div>
  );
}
