import styles from './PropertiesClient.module.css';

export default function PropertyGridSkeleton() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card" style={{ overflow: 'hidden' }}>
          <div className="skeleton" style={{ height: '200px', borderRadius: 0 }} />
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton" style={{ height: '18px', width: '80%' }} />
            <div className="skeleton" style={{ height: '13px', width: '50%' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="skeleton" style={{ height: '28px', width: '60px', borderRadius: '999px' }} />
              <div className="skeleton" style={{ height: '28px', width: '60px', borderRadius: '999px' }} />
              <div className="skeleton" style={{ height: '28px', width: '70px', borderRadius: '999px' }} />
            </div>
            <div className="skeleton" style={{ height: '22px', width: '45%', marginTop: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
