import { useState } from 'react';
import { CreditApplication } from '../types/fi.types';
import { CreditApplicationFormData } from '../hooks/useCreditApplication';

interface Props {
  existingApp: CreditApplication | null;
  onSaveDraft: (data: CreditApplicationFormData & { supersede?: boolean }) => Promise<CreditApplication>;
  onSubmit: () => Promise<CreditApplication>;
  readOnly?: boolean;
  loading?: boolean;
}

export function CreditApplicationForm({ existingApp, onSaveDraft, onSubmit, readOnly, loading }: Props) {
  const [form, setForm] = useState<Partial<CreditApplicationFormData>>({
    annualIncome: existingApp ? Number(existingApp.annualIncome) : undefined,
    employerName: existingApp?.employerName ?? '',
    employmentLengthMonths: existingApp?.employmentLengthMonths ?? undefined,
    housingType: existingApp?.housingType ?? 'Rent',
    monthlyHousingPayment: existingApp ? Number(existingApp.monthlyHousingPayment) : undefined,
    dateOfBirth: existingApp?.dateOfBirth ?? '',
    ssn: '',
  });
  const [ssnVisible, setSsnVisible] = useState(false);
  const [showSupersedeModal, setShowSupersedeModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof CreditApplicationFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (supersede = false) => {
    setSaving(true);
    setError(null);
    try {
      if (existingApp?.status === 'Submitted' && !supersede) {
        setShowSupersedeModal(true);
        return;
      }
      await onSaveDraft({ ...(form as CreditApplicationFormData), supersede });
      setShowSupersedeModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }} aria-busy="true">
        <div style={{ height: 20, background: '#e0e0e0', borderRadius: 4, marginBottom: 12 }} />
        <div style={{ height: 20, background: '#e0e0e0', borderRadius: 4, marginBottom: 12, width: '70%' }} />
        <div style={{ height: 20, background: '#e0e0e0', borderRadius: 4, width: '50%' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <h2 style={{ marginBottom: 16 }}>Credit Application</h2>

      {existingApp && (
        <div style={{ marginBottom: 12, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
          Status: <strong>{existingApp.status}</strong>
          {existingApp.status !== 'Draft' && !readOnly && (
            <span style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>
              (read-only — supersede to create a new application)
            </span>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 12, padding: 8, background: '#ffebee', borderRadius: 4, color: '#c62828' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        <label>
          Annual Income ($)
          <input
            type="number"
            value={form.annualIncome ?? ''}
            onChange={(e) => handleChange('annualIncome', Number(e.target.value))}
            disabled={readOnly || saving}
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4, borderRadius: 8, border: '1px solid #ccc' }}
          />
        </label>

        <label>
          Employer Name
          <input
            type="text"
            value={form.employerName ?? ''}
            onChange={(e) => handleChange('employerName', e.target.value)}
            disabled={readOnly || saving}
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4, borderRadius: 8, border: '1px solid #ccc' }}
          />
        </label>

        <label>
          Employment Length (months)
          <input
            type="number"
            value={form.employmentLengthMonths ?? ''}
            onChange={(e) => handleChange('employmentLengthMonths', Number(e.target.value))}
            disabled={readOnly || saving}
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4, borderRadius: 8, border: '1px solid #ccc' }}
          />
        </label>

        <label>
          Housing Type
          <select
            value={form.housingType ?? 'Rent'}
            onChange={(e) => handleChange('housingType', e.target.value)}
            disabled={readOnly || saving}
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4, borderRadius: 8, border: '1px solid #ccc' }}
          >
            <option value="Own">Own</option>
            <option value="Rent">Rent</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label>
          Monthly Housing Payment ($)
          <input
            type="number"
            value={form.monthlyHousingPayment ?? ''}
            onChange={(e) => handleChange('monthlyHousingPayment', Number(e.target.value))}
            disabled={readOnly || saving}
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4, borderRadius: 8, border: '1px solid #ccc' }}
          />
        </label>

        <label>
          Date of Birth
          <input
            type="date"
            value={form.dateOfBirth ?? ''}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            disabled={readOnly || saving}
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4, borderRadius: 8, border: '1px solid #ccc' }}
          />
        </label>

        <label>
          Social Security Number
          {existingApp ? (
            <div style={{ padding: '8px', marginTop: 4, background: '#f9f9f9', borderRadius: 8, border: '1px solid #ccc', fontFamily: 'monospace' }}>
              {existingApp.ssnMasked}
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                type={ssnVisible ? 'text' : 'password'}
                value={form.ssn ?? ''}
                onChange={(e) => handleChange('ssn', e.target.value)}
                placeholder="XXX-XX-XXXX"
                disabled={readOnly || saving}
                style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4, borderRadius: 8, border: '1px solid #ccc' }}
              />
              <button
                type="button"
                onClick={() => setSsnVisible((v) => !v)}
                style={{ position: 'absolute', right: 8, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
              >
                {ssnVisible ? 'Hide' : 'Show'}
              </button>
            </div>
          )}
        </label>
      </div>

      {!readOnly && (
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button
            onClick={() => handleSave()}
            disabled={saving}
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #1976d2', background: 'white', color: '#1976d2', cursor: 'pointer' }}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          {existingApp?.status === 'Draft' && (
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1976d2', color: 'white', cursor: 'pointer' }}
            >
              {saving ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      )}

      {/* Supersede confirmation modal */}
      {showSupersedeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 400 }}>
            <h3 style={{ marginBottom: 12 }}>Active Application Exists</h3>
            <p style={{ marginBottom: 16 }}>
              This deal already has a Submitted credit application. Creating a new one will archive the existing application. Do you want to continue?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSupersedeModal(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#d32f2f', color: 'white', cursor: 'pointer' }}
              >
                Supersede & Create New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
