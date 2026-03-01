import { useMemo, useState } from 'react';
import { useDisastersList } from '../../api/hooks';
import { useDisasterReport } from '../../api/useCommandCenter';
import styles from '../../components/command-center/CommandCenter.module.css';

function toCSV(report = {}) {
  const rows = [
    ['Metric', 'Value'],
    ['Disaster', report.disaster_name ?? '—'],
    ['Total Needs', report.total_needs ?? 0],
    ['Total Volunteers', report.total_volunteers ?? 0],
    ['Average Response Time (minutes)', report.avg_response_time ?? 0],
    ['Escalation Count', report.escalation_count ?? 0],
    ['SLA Compliance (%)', report.sla_compliance_pct ?? 0],
  ];
  return rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
}

function downloadFile(content, type, fileName) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const [disasterId, setDisasterId] = useState('');
  const { data: disasters } = useDisastersList();
  const { data: report, isLoading, error } = useDisasterReport(disasterId || undefined);

  const selectedDisaster = useMemo(
    () => (Array.isArray(disasters) ? disasters.find((d) => String(d.id) === String(disasterId)) : null),
    [disasters, disasterId],
  );

  const onExportCSV = () => {
    if (!report) return;
    downloadFile(toCSV(report), 'text/csv;charset=utf-8', `after-action-${disasterId || 'report'}.csv`);
  };

  const onExportPDF = () => {
    if (!report) return;
    const html = `
      <html>
      <head><title>After Action Report</title></head>
      <body style="font-family:Arial;padding:24px">
        <h1>After-Action Report</h1>
        <p><strong>Disaster:</strong> ${report.disaster_name || selectedDisaster?.name || '—'}</p>
        <ul>
          <li>Total needs: ${report.total_needs ?? 0}</li>
          <li>Total volunteers: ${report.total_volunteers ?? 0}</li>
          <li>Average response time: ${report.avg_response_time ?? 0} min</li>
          <li>Escalation count: ${report.escalation_count ?? 0}</li>
          <li>SLA compliance: ${report.sla_compliance_pct ?? 0}%</li>
        </ul>
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>After-Action Reports</h1>
          <p className={styles.subtitle}>Generate summary metrics and export report outputs.</p>
        </div>
      </div>

      <div className={styles.filtersRow}>
        <select className={styles.select} value={disasterId} onChange={(e) => setDisasterId(e.target.value)}>
          <option value="">Select Disaster</option>
          {(Array.isArray(disasters) ? disasters : []).map((d) => (
            <option key={d.id} value={d.id}>{d.name || d.id}</option>
          ))}
        </select>

        <button className={styles.button} onClick={onExportPDF} disabled={!report}>Export PDF</button>
        <button className={styles.button} onClick={onExportCSV} disabled={!report}>Export CSV</button>
      </div>

      {isLoading && disasterId && <div className={`${styles.card} ${styles.skeleton}`} style={{ height: 220 }} />}
      {error && <div className={styles.card} style={{ color: 'var(--color-danger)' }}>{error.message}</div>}

      {report && (
        <div className={styles.kpiRow}>
          <div className={styles.kpiCard}><span className={styles.kpiLabel}>Total Needs</span><div className={styles.kpiValue}>{report.total_needs ?? 0}</div></div>
          <div className={styles.kpiCard}><span className={styles.kpiLabel}>Total Volunteers</span><div className={styles.kpiValue}>{report.total_volunteers ?? 0}</div></div>
          <div className={styles.kpiCard}><span className={styles.kpiLabel}>Avg Response Time</span><div className={styles.kpiValue}>{Number(report.avg_response_time ?? 0).toFixed(1)}m</div></div>
          <div className={styles.kpiCard}><span className={styles.kpiLabel}>Escalation Count</span><div className={styles.kpiValue}>{report.escalation_count ?? 0}</div></div>
          <div className={styles.kpiCard}><span className={styles.kpiLabel}>SLA Compliance</span><div className={styles.kpiValue}>{Number(report.sla_compliance_pct ?? 0).toFixed(1)}%</div></div>
        </div>
      )}
    </div>
  );
}
