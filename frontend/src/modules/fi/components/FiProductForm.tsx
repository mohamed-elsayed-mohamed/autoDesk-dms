import React, { useState } from 'react';
import { FIProduct, FiProductType, ProductCatalogItem } from '../types/fi.types';

interface Props {
  catalog: ProductCatalogItem[];
  initial?: Partial<FIProduct>;
  onSave: (data: FiProductFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export interface FiProductFormData {
  productType: FiProductType;
  providerName: string;
  cost: number;
  sellingPrice: number;
  termMonths: number;
  deductible?: number;
  contractNumber?: string;
}

const PRODUCT_TYPES: FiProductType[] = ['VSC', 'GAP', 'TireWheel', 'PaintProtection', 'MaintenancePlan', 'Other'];

const PRODUCT_TYPE_LABELS: Record<FiProductType, string> = {
  VSC: 'Extended Warranty (VSC)',
  GAP: 'GAP Insurance',
  TireWheel: 'Tire & Wheel',
  PaintProtection: 'Paint Protection',
  MaintenancePlan: 'Maintenance Plan',
  Other: 'Other',
};

export function FiProductForm({ catalog, initial, onSave, onCancel, loading }: Props) {
  const [productType, setProductType] = useState<FiProductType>(initial?.productType ?? 'VSC');
  const [providerName, setProviderName] = useState(initial?.providerName ?? '');
  const [cost, setCost] = useState(initial?.cost?.toString() ?? '');
  const [sellingPrice, setSellingPrice] = useState(initial?.sellingPrice?.toString() ?? '');
  const [termMonths, setTermMonths] = useState(initial?.termMonths?.toString() ?? '12');
  const [deductible, setDeductible] = useState(initial?.deductible?.toString() ?? '');
  const [contractNumber, setContractNumber] = useState(initial?.contractNumber ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate from catalog selection
  const handleCatalogChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const item = catalog.find((c) => c.id === e.target.value);
    if (item) {
      setProductType(item.productType);
      setProviderName(item.providerName);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!providerName.trim()) errs.providerName = 'Provider name is required';
    if (!cost || isNaN(parseFloat(cost))) errs.cost = 'Valid cost is required';
    if (!sellingPrice || isNaN(parseFloat(sellingPrice))) errs.sellingPrice = 'Valid selling price is required';
    if (!termMonths || isNaN(parseInt(termMonths))) errs.termMonths = 'Valid term is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      productType,
      providerName,
      cost: parseFloat(cost),
      sellingPrice: parseFloat(sellingPrice),
      termMonths: parseInt(termMonths),
      deductible: deductible ? parseFloat(deductible) : undefined,
      contractNumber: contractNumber || undefined,
    });
  };

  const gross = parseFloat(sellingPrice || '0') - parseFloat(cost || '0');

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {catalog.length > 0 && (
        <div>
          <label style={labelStyle}>Quick Select from Catalog</label>
          <select onChange={handleCatalogChange} style={inputStyle} defaultValue="">
            <option value="">— Choose from catalog —</option>
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>
                {PRODUCT_TYPE_LABELS[item.productType]} — {item.providerName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Product Type *</label>
          <select value={productType} onChange={(e) => setProductType(e.target.value as FiProductType)} style={inputStyle}>
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Provider Name *</label>
          <input value={providerName} onChange={(e) => setProviderName(e.target.value)} style={inputStyle} />
          {errors.providerName && <span style={errorStyle}>{errors.providerName}</span>}
        </div>
        <div>
          <label style={labelStyle}>Cost ($) *</label>
          <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} style={inputStyle} />
          {errors.cost && <span style={errorStyle}>{errors.cost}</span>}
        </div>
        <div>
          <label style={labelStyle}>Selling Price ($) *</label>
          <input type="number" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} style={inputStyle} />
          {errors.sellingPrice && <span style={errorStyle}>{errors.sellingPrice}</span>}
        </div>
        <div>
          <label style={labelStyle}>Term (months) *</label>
          <input type="number" min="1" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} style={inputStyle} />
          {errors.termMonths && <span style={errorStyle}>{errors.termMonths}</span>}
        </div>
        <div>
          <label style={labelStyle}>Deductible ($)</label>
          <input type="number" step="0.01" value={deductible} onChange={(e) => setDeductible(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Contract Number</label>
          <input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ padding: '10px 14px', borderRadius: 8, background: gross >= 0 ? '#e8f5e9' : '#ffebee', color: gross >= 0 ? '#1b5e20' : '#b71c1c', fontWeight: 600 }}>
        Gross: {gross >= 0 ? '+' : ''}${gross.toFixed(2)}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={cancelBtnStyle} disabled={loading}>Cancel</button>
        <button type="submit" style={saveBtnStyle} disabled={loading}>
          {loading ? 'Saving…' : initial?.id ? 'Save Changes' : 'Add Product'}
        </button>
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#616161', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #bdbdbd', fontSize: 14, boxSizing: 'border-box' };
const errorStyle: React.CSSProperties = { fontSize: 11, color: '#d32f2f', marginTop: 2 };
const saveBtnStyle: React.CSSProperties = { padding: '8px 18px', borderRadius: 8, border: 'none', background: '#1976d2', color: 'white', fontWeight: 600, cursor: 'pointer' };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 18px', borderRadius: 8, border: '1px solid #bdbdbd', background: 'white', color: '#424242', cursor: 'pointer' };
