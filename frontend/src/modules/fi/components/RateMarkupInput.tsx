import React, { useState } from 'react';
import Decimal from 'decimal.js';

interface Props {
  buyRate: number;
  maxMarkupCap?: number | null;
  value: number;
  onChange: (markup: number) => void;
  disabled?: boolean;
}

export function RateMarkupInput({ buyRate, maxMarkupCap, value, onChange, disabled }: Props) {
  const [inputStr, setInputStr] = useState(value.toString());

  const markup = new Decimal(isNaN(value) ? 0 : value);
  const buy = new Decimal(isNaN(buyRate) ? 0 : buyRate);
  const sellRate = buy.plus(markup);
  const capExceeded = maxMarkupCap != null && markup.greaterThan(new Decimal(maxMarkupCap));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputStr(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#424242' }}>Rate Markup (%)</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="number"
          step="0.01"
          min="0"
          value={inputStr}
          onChange={handleChange}
          disabled={disabled}
          style={{
            width: 100,
            padding: '8px 10px',
            borderRadius: 8,
            border: `1px solid ${capExceeded ? '#f44336' : '#bdbdbd'}`,
            fontSize: 14,
            outline: 'none',
          }}
        />
        <div style={{ fontSize: 14, color: '#424242' }}>
          Buy Rate: <strong>{buy.toFixed(2)}%</strong>
          {'  +  '}
          Markup: <strong>{markup.toFixed(2)}%</strong>
          {'  =  '}
          <span style={{ color: '#1976d2', fontWeight: 700 }}>
            Sell Rate: {sellRate.toFixed(2)}%
          </span>
        </div>
      </div>

      {maxMarkupCap != null && (
        <div style={{ fontSize: 12, color: '#757575' }}>
          Max cap: {maxMarkupCap}%
          {capExceeded && (
            <span style={{
              marginLeft: 8,
              padding: '2px 8px',
              borderRadius: 4,
              background: '#fff3e0',
              color: '#e65100',
              fontWeight: 600,
            }}>
              ⚠ Markup exceeds cap — lender may reject
            </span>
          )}
        </div>
      )}
    </div>
  );
}
