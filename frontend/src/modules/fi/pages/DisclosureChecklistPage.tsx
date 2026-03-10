import React, { useState } from 'react';
import { DisclosureChecklist } from '../components/DisclosureChecklist';
import { useDisclosures } from '../hooks/useDisclosures';
import { FiErrorBoundary } from '../components/FiErrorBoundary';

interface Props {
  dealId: string;
  readOnly?: boolean;
}

function DisclosureChecklistPageInner({ dealId, readOnly }: Props) {
  const { status, loading, error, confirmDisclosure } = useDisclosures(dealId);
  const [confirmingName, setConfirmingName] = useState<string | null>(null);

  const handleConfirm = async (disclosureName: string) => {
    setConfirmingName(disclosureName);
    await confirmDisclosure(disclosureName);
    setConfirmingName(null);
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={skeleton} />
        <div style={{ ...skeleton, width: '60%', marginTop: 12 }} />
        <div style={{ ...skeleton, width: '80%', marginTop: 12 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: '#d32f2f', background: '#ffebee', borderRadius: 8 }}>
        Failed to load disclosures: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 20, color: '#212121' }}>Disclosure Checklist</h2>
      {status ? (
        <DisclosureChecklist
          status={status}
          onConfirm={handleConfirm}
          readOnly={readOnly}
          loading={confirmingName != null}
        />
      ) : (
        <p style={{ color: '#757575' }}>No disclosure information available.</p>
      )}
    </div>
  );
}

export function DisclosureChecklistPage(props: Props) {
  return (
    <FiErrorBoundary pageName="the disclosure checklist">
      <DisclosureChecklistPageInner {...props} />
    </FiErrorBoundary>
  );
}

const skeleton: React.CSSProperties = { height: 20, borderRadius: 4, background: '#e0e0e0' };
