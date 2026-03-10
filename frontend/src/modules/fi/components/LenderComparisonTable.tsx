import React from 'react';
import { LenderSubmission } from '../types/fi.types';

interface Props {
  submissions: LenderSubmission[];
  onSelect: (submission: LenderSubmission) => void;
  selectedId?: string;
  readOnly?: boolean;
}

const DECISION_STYLES: Record<string, { background: string; color: string; label: string }> = {
  Approved: { background: '#e8f5e9', color: '#1b5e20', label: 'Approved' },
  Conditional: { background: '#fff8e1', color: '#f57f17', label: 'Conditional' },
  Declined: { background: '#ffebee', color: '#b71c1c', label: 'Declined' },
};

export function LenderComparisonTable({ submissions, onSelect, selectedId, readOnly }: Props) {
  if (submissions.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#757575' }}>
        No lender submissions yet — Submit to lenders to see decisions here.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={th}>Lender</th>
            <th style={th}>Decision</th>
            <th style={th}>Approved Amount</th>
            <th style={th}>Buy Rate</th>
            <th style={th}>Max Term</th>
            <th style={th}>Stipulations</th>
            {!readOnly && <th style={th}>Action</th>}
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => {
            const style = DECISION_STYLES[sub.decision] ?? DECISION_STYLES.Declined;
            const isSelected = sub.id === selectedId || sub.isSelected;
            return (
              <tr key={sub.id} style={{ background: isSelected ? '#e3f2fd' : 'white', borderBottom: '1px solid #e0e0e0' }}>
                <td style={td}>{sub.lenderName}</td>
                <td style={td}>
                  <span style={{ padding: '4px 10px', borderRadius: 12, background: style.background, color: style.color, fontWeight: 600 }}>
                    {style.label}
                  </span>
                </td>
                <td style={td}>{sub.approvedAmount ? `$${Number(sub.approvedAmount).toLocaleString()}` : 'N/A'}</td>
                <td style={td}>{sub.buyRate ? `${sub.buyRate}%` : 'N/A'}</td>
                <td style={td}>{sub.maxTerm ? `${sub.maxTerm} mo` : 'N/A'}</td>
                <td style={td}>{sub.stipulations ?? '—'}</td>
                {!readOnly && (
                  <td style={td}>
                    {sub.decision !== 'Declined' ? (
                      <button
                        onClick={() => onSelect(sub)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          border: '1px solid #1976d2',
                          background: isSelected ? '#1976d2' : 'white',
                          color: isSelected ? 'white' : '#1976d2',
                          cursor: 'pointer',
                        }}
                      >
                        {isSelected ? 'Selected ✓' : 'Select'}
                      </button>
                    ) : (
                      <span style={{ color: '#9e9e9e', fontSize: 12 }}>Cannot select</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e0e0e0' };
const td: React.CSSProperties = { padding: '10px 12px' };
