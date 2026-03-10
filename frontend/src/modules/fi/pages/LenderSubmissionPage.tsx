import React, { useState } from 'react';
import { LenderComparisonTable } from '../components/LenderComparisonTable';
import { RateMarkupInput } from '../components/RateMarkupInput';
import { useLenderSubmissions } from '../hooks/useLenderSubmissions';
import { LenderSubmission } from '../types/fi.types';
import { FiErrorBoundary } from '../components/FiErrorBoundary';

interface Props {
  dealId: string;
  readOnly?: boolean;
}

function LenderSubmissionPageInner({ dealId, readOnly }: Props) {
  const {
    submissions,
    activeLenders,
    loading,
    error,
    submitToLenders,
    selectDecision,
  } = useLenderSubmissions(dealId);
  const [submitting, setSubmitting] = useState(false);

  const [selectedLenderIds, setSelectedLenderIds] = useState<string[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<LenderSubmission | null>(null);
  const [rateMarkup, setRateMarkup] = useState(0);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const currentSelection = submissions.find((s) => s.isSelected);

  const handleSubmitToLenders = async () => {
    if (selectedLenderIds.length === 0) return;
    setSubmitting(true);
    try {
      await submitToLenders(selectedLenderIds);
      setSelectedLenderIds([]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelect = (sub: LenderSubmission) => {
    setSelectedSubmission(sub);
    setRateMarkup(0);
  };

  const handleConfirmSelection = async () => {
    if (!selectedSubmission) return;
    setConfirmLoading(true);
    await selectDecision({
      lenderSubmissionId: selectedSubmission.id,
      rateMarkup,
      selectedTerm: selectedSubmission.maxTerm ?? 72,
    });
    setConfirmLoading(false);
    setSelectedSubmission(null);
  };

  const toggleLender = (lenderId: string) => {
    setSelectedLenderIds((prev) =>
      prev.includes(lenderId) ? prev.filter((id) => id !== lenderId) : [...prev, lenderId]
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={skeleton} />
        <div style={{ ...skeleton, width: '60%', marginTop: 12 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: '#d32f2f', background: '#ffebee', borderRadius: 8 }}>
        Failed to load lender submissions: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 20, color: '#212121' }}>Lender Submission & Decisions</h2>

      {/* Submit to lenders */}
      {!readOnly && (
        <div style={{ marginBottom: 24, padding: 16, border: '1px solid #e0e0e0', borderRadius: 10 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Submit to Lenders</h3>
          {activeLenders.length === 0 ? (
            <p style={{ color: '#757575', fontSize: 14 }}>No active lenders configured.</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                {activeLenders.map((lender) => (
                  <label key={lender.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={selectedLenderIds.includes(lender.id)}
                      onChange={() => toggleLender(lender.id)}
                    />
                    {lender.name}
                    {lender.maxMarkupCap != null && (
                      <span style={{ fontSize: 11, color: '#757575' }}>(cap: {lender.maxMarkupCap}%)</span>
                    )}
                  </label>
                ))}
              </div>
              <button
                onClick={handleSubmitToLenders}
                disabled={selectedLenderIds.length === 0 || submitting}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: selectedLenderIds.length === 0 ? '#e0e0e0' : '#1976d2',
                  color: selectedLenderIds.length === 0 ? '#9e9e9e' : 'white',
                  fontWeight: 600,
                  cursor: selectedLenderIds.length === 0 ? 'default' : 'pointer',
                }}
              >
                {submitting ? 'Submitting…' : `Submit to ${selectedLenderIds.length} Lender${selectedLenderIds.length !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Decisions table */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Lender Decisions</h3>
        <LenderComparisonTable
          submissions={submissions}
          onSelect={handleSelect}
          selectedId={currentSelection?.id}
          readOnly={readOnly}
        />
      </div>

      {/* Rate markup + confirm */}
      {!readOnly && selectedSubmission && selectedSubmission.decision !== 'Declined' && (
        <div style={{ padding: 20, border: '1px solid #1976d2', borderRadius: 10, background: '#e3f2fd' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>
            Confirm Selection — {selectedSubmission.lenderName}
            <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 400, color: '#555' }}>
              Buy Rate: {selectedSubmission.buyRate}%
            </span>
          </h3>
          <RateMarkupInput
            buyRate={Number(selectedSubmission.buyRate)}
            maxMarkupCap={Number(activeLenders.find((l) => l.name === selectedSubmission.lenderName)?.maxMarkupCap) || null}
            value={rateMarkup}
            onChange={setRateMarkup}
          />
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={() => setSelectedSubmission(null)} style={cancelBtn}>Cancel</button>
            <button onClick={handleConfirmSelection} disabled={confirmLoading} style={confirmBtn}>
              {confirmLoading ? 'Saving…' : 'Confirm Selection'}
            </button>
          </div>
        </div>
      )}

      {/* Existing selection banner */}
      {currentSelection && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: '#e8f5e9', border: '1px solid #a5d6a7', fontSize: 14 }}>
          <strong style={{ color: '#1b5e20' }}>Selected Decision:</strong>{' '}
          {currentSelection.lenderName} — Buy Rate {currentSelection.buyRate}%
        </div>
      )}
    </div>
  );
}

export function LenderSubmissionPage(props: Props) {
  return (
    <FiErrorBoundary pageName="lender submissions">
      <LenderSubmissionPageInner {...props} />
    </FiErrorBoundary>
  );
}

const skeleton: React.CSSProperties = { height: 20, borderRadius: 4, background: '#e0e0e0' };
const cancelBtn: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: '1px solid #bdbdbd', background: 'white', cursor: 'pointer' };
const confirmBtn: React.CSSProperties = { padding: '8px 18px', borderRadius: 8, border: 'none', background: '#1976d2', color: 'white', fontWeight: 600, cursor: 'pointer' };
