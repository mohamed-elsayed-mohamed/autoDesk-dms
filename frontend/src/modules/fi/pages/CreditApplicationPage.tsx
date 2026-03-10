import { CreditApplicationForm } from '../components/CreditApplicationForm';
import { useCreditApplication } from '../hooks/useCreditApplication';
import { FiErrorBoundary } from '../components/FiErrorBoundary';

interface Props {
  dealId: string;
  customerId?: string;
  readOnly?: boolean;
}

function CreditApplicationPageInner({ dealId, readOnly }: Props) {
  const {
    creditApp,
    loading,
    error,
    saveDraft,
    submitApplication,
  } = useCreditApplication(dealId);

  if (error) {
    return (
      <div style={{ padding: 24, color: '#d32f2f', background: '#ffebee', borderRadius: 8 }}>
        Failed to load credit application: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 20, color: '#212121' }}>Credit Application</h2>
      <CreditApplicationForm
        existingApp={creditApp}
        onSaveDraft={saveDraft}
        onSubmit={submitApplication}
        loading={loading}
        readOnly={readOnly}
      />
    </div>
  );
}

export function CreditApplicationPage(props: Props) {
  return (
    <FiErrorBoundary pageName="the credit application">
      <CreditApplicationPageInner {...props} />
    </FiErrorBoundary>
  );
}
