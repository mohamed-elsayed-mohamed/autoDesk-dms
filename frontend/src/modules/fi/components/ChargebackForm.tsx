import React, { useState } from 'react';

interface Props {
  onConfirm: (amount: number, date: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ChargebackForm({ onConfirm, onCancel, loading }: Props) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      errs.amount = 'A positive chargeback amount is required';
    }
    if (!date) errs.date = 'Chargeback date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProceed = () => {
    if (!validate()) return;
    setConfirmed(true);
  };

  const handleConfirm = () => {
    onConfirm(parseFloat(amount), date);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 28, width: 400, maxWidth: '90vw' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 17 }}>Record Chargeback</h3>

        {!confirmed ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Chargeback Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={inputStyle}
                placeholder="0.00"
              />
              {errors.amount && <span style={errorStyle}>{errors.amount}</span>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Chargeback Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
              {errors.date && <span style={errorStyle}>{errors.date}</span>}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleProceed} style={warnBtnStyle}>Continue →</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fff3e0', marginBottom: 20 }}>
              <p style={{ margin: 0, fontWeight: 600, color: '#e65100' }}>Confirm Chargeback</p>
              <p style={{ margin: '8px 0 0', fontSize: 14, color: '#424242' }}>
                Amount: <strong>${parseFloat(amount).toFixed(2)}</strong><br />
                Date: <strong>{date}</strong>
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#757575' }}>
                This action will mark the product as Charged Back. This cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmed(false)} style={cancelBtnStyle}>Back</button>
              <button onClick={handleConfirm} disabled={loading} style={dangerBtnStyle}>
                {loading ? 'Saving…' : 'Confirm Chargeback'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#616161', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #bdbdbd', fontSize: 14, boxSizing: 'border-box' };
const errorStyle: React.CSSProperties = { fontSize: 11, color: '#d32f2f', marginTop: 2, display: 'block' };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: '1px solid #bdbdbd', background: 'white', color: '#424242', cursor: 'pointer' };
const warnBtnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ff9800', color: 'white', fontWeight: 600, cursor: 'pointer' };
const dangerBtnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#d32f2f', color: 'white', fontWeight: 600, cursor: 'pointer' };
