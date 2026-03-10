import { DisclosureStatus } from '../types/fi.types';

interface Props {
  status: DisclosureStatus;
  onConfirm: (disclosureName: string) => Promise<void>;
  readOnly?: boolean;
  loading?: boolean;
}

export function DisclosureChecklist({ status, onConfirm, readOnly, loading }: Props) {
  const { requirements, confirmations } = status;

  if (requirements.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#757575' }}>
        No disclosure requirements configured for this jurisdiction.
      </div>
    );
  }

  const confirmedNames = new Set(confirmations.map((c) => c.disclosureName));
  const confirmedCount = requirements.filter((r) => confirmedNames.has(r.disclosureName)).length;
  const total = requirements.length;
  const allDone = confirmedCount === total;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Completion indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderRadius: 10,
        background: allDone ? '#e8f5e9' : '#fff8e1',
        border: `1px solid ${allDone ? '#a5d6a7' : '#ffe082'}`,
      }}>
        <span style={{ fontSize: 22 }}>{allDone ? '✅' : '⚠️'}</span>
        <div>
          <strong style={{ fontSize: 15, color: allDone ? '#1b5e20' : '#f57f17' }}>
            {confirmedCount} of {total} disclosures confirmed
          </strong>
          {!allDone && (
            <div style={{ fontSize: 12, color: '#757575', marginTop: 2 }}>
              {total - confirmedCount} remaining
            </div>
          )}
        </div>
      </div>

      {/* Disclosure list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {requirements.map((req) => {
          const confirmation = confirmations.find((c) => c.disclosureName === req.disclosureName);
          const isConfirmed = !!confirmation;
          return (
            <div key={req.id} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 8,
              background: isConfirmed ? '#f1f8e9' : 'white',
              border: `1px solid ${isConfirmed ? '#c5e1a5' : '#e0e0e0'}`,
            }}>
              <div style={{ paddingTop: 2 }}>
                {isConfirmed ? (
                  <span style={{ color: '#43a047', fontSize: 18 }}>✓</span>
                ) : (
                  <div style={{ width: 18, height: 18, borderRadius: 3, border: '2px solid #bdbdbd' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#212121' }}>
                  {req.disclosureName}
                </div>
                {isConfirmed && confirmation && (
                  <div style={{ fontSize: 12, color: '#616161', marginTop: 4 }}>
                    Confirmed by {confirmation.confirmedByName} ({confirmation.confirmedByRole})
                    {' — '}
                    {new Date(confirmation.confirmedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              {!isConfirmed && !readOnly && (
                <button
                  onClick={() => onConfirm(req.disclosureName)}
                  disabled={loading}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: '1px solid #1976d2',
                    background: 'white',
                    color: '#1976d2',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {loading ? '…' : 'Confirm'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
