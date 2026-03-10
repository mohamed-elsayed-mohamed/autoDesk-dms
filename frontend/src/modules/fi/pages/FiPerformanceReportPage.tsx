import { useState, type CSSProperties } from 'react';
import { useFiPerformanceReport } from '../hooks/useFiPerformanceReport';
import { FiErrorBoundary } from '../components/FiErrorBoundary';

const today = new Date().toISOString().split('T')[0];
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

function FiPerformanceReportPageInner() {
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [exporting, setExporting] = useState(false);

  const { report, loading, error, getReport, exportCsv } = useFiPerformanceReport();

  const handleRun = () => {
    getReport(from, to).catch(() => undefined);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCsv(from, to);
    } finally {
      setExporting(false);
    }
  };

  const fmt = (v: string | number | null | undefined) =>
    v == null ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 20, color: '#212121' }}>F&I Performance Report</h2>

      {/* Date range filter */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <label style={labelStyle}>From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
        </div>
        <button onClick={handleRun} disabled={loading} style={runBtnStyle}>
          {loading ? 'Loading…' : 'Run Report'}
        </button>
        {report && (
          <button onClick={handleExport} disabled={exporting} style={exportBtnStyle}>
            {exporting ? 'Exporting…' : '⬇ Export CSV'}
          </button>
        )}
      </div>

      {error && (
        <div style={{ color: '#d32f2f', background: '#ffebee', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {report && (
        <>
          {/* Summary row */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Revenue', value: fmt(report.totalFiRevenue) },
              { label: 'Total Chargebacks', value: fmt(report.totalChargebacks), negative: true },
              { label: 'Net Revenue', value: fmt(report.netFiRevenue) },
              { label: 'PVR', value: report.pvr != null ? fmt(report.pvr) : '—' },
              { label: 'Funded Units', value: report.fundedUnitCount.toString() },
            ].map((item) => (
              <div key={item.label} style={{
                flex: '1 1 160px',
                padding: '14px 18px',
                borderRadius: 10,
                background: '#f5f5f5',
                minWidth: 130,
              }}>
                <div style={{ fontSize: 11, color: '#757575', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: item.negative ? '#b71c1c' : '#212121' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Per-deal breakdown */}
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Deal Breakdown</h3>
          {report.deals.length === 0 ? (
            <p style={{ color: '#757575', fontSize: 14 }}>No funded deals in this period.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={th}>Deal</th>
                    <th style={th}>Funded Date</th>
                    <th style={th}>Revenue</th>
                    <th style={th}>Chargebacks</th>
                    <th style={th}>Net</th>
                    <th style={th}>Products</th>
                  </tr>
                </thead>
                <tbody>
                  {report.deals.map((deal) => (
                    <tr key={deal.dealId} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={td}>{deal.dealNumber ?? deal.dealId}</td>
                      <td style={td}>{deal.fundedAt ? new Date(deal.fundedAt).toLocaleDateString() : '—'}</td>
                      <td style={td}>{fmt(deal.totalFiRevenue)}</td>
                      <td style={{ ...td, color: Number(deal.totalChargebacks) > 0 ? '#b71c1c' : '#424242' }}>
                        {fmt(deal.totalChargebacks)}
                      </td>
                      <td style={{ ...td, fontWeight: 600, color: Number(deal.netFiRevenue) >= 0 ? '#1b5e20' : '#b71c1c' }}>
                        {fmt(deal.netFiRevenue)}
                      </td>
                      <td style={td}>{deal.productCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!report && !loading && (
        <div style={{ padding: 32, textAlign: 'center', color: '#757575' }}>
          Select a date range and click "Run Report" to view results.
        </div>
      )}
    </div>
  );
}

export function FiPerformanceReportPage() {
  return (
    <FiErrorBoundary pageName="the F&I performance report">
      <FiPerformanceReportPageInner />
    </FiErrorBoundary>
  );
}

const labelStyle: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#616161', marginBottom: 4 };
const inputStyle: CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #bdbdbd', fontSize: 14 };
const runBtnStyle: CSSProperties = { padding: '8px 18px', borderRadius: 8, border: 'none', background: '#1976d2', color: 'white', fontWeight: 600, cursor: 'pointer' };
const exportBtnStyle: CSSProperties = { padding: '8px 18px', borderRadius: 8, border: '1px solid #388e3c', background: 'white', color: '#388e3c', fontWeight: 600, cursor: 'pointer' };
const th: CSSProperties = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e0e0e0' };
const td: CSSProperties = { padding: '10px 12px' };

