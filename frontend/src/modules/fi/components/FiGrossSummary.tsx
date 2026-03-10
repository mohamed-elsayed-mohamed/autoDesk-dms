import React from 'react';

interface Props {
  totalFiGross: number;
  backEndGross?: number;
  productCount: number;
}

export function FiGrossSummary({ totalFiGross, backEndGross, productCount }: Props) {
  const isPositive = totalFiGross >= 0;

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      padding: '12px 16px',
      borderRadius: 10,
      background: '#f5f5f5',
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      <div style={statBox}>
        <span style={statLabel}>Products</span>
        <span style={statValue}>{productCount}</span>
      </div>
      <div style={{ width: 1, height: 36, background: '#e0e0e0' }} />
      <div style={statBox}>
        <span style={statLabel}>Total F&I Gross</span>
        <span style={{ ...statValue, color: isPositive ? '#1b5e20' : '#b71c1c', fontSize: 20 }}>
          {isPositive ? '+' : ''}${totalFiGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      {backEndGross !== undefined && (
        <>
          <div style={{ width: 1, height: 36, background: '#e0e0e0' }} />
          <div style={statBox}>
            <span style={statLabel}>Deal Back-End Gross</span>
            <span style={{ ...statValue, color: backEndGross >= 0 ? '#1565c0' : '#b71c1c', fontSize: 18 }}>
              ${backEndGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

const statBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 };
const statLabel: React.CSSProperties = { fontSize: 11, color: '#757575', textTransform: 'uppercase', letterSpacing: 0.5 };
const statValue: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: '#212121' };
