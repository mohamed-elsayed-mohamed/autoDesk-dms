import React, { useState } from 'react';
import { FIProduct, FiProductType, ProductCatalogItem } from '../types/fi.types';
import { FiProductStatusBadge } from './FiProductStatusBadge';
import { FiProductForm, FiProductFormData } from './FiProductForm';
import { ChargebackForm } from './ChargebackForm';

interface Props {
  products: FIProduct[];
  catalog: ProductCatalogItem[];
  onAdd: (data: FiProductFormData) => Promise<void>;
  onEdit: (productId: string, data: FiProductFormData) => Promise<void>;
  onRemove: (productId: string) => Promise<void>;
  onChargeback: (productId: string, amount: number, date: string) => Promise<void>;
  readOnly?: boolean;
  dealDelivered?: boolean;
}

const PRODUCT_TYPE_LABELS: Record<FiProductType, string> = {
  VSC: 'Extended Warranty (VSC)',
  GAP: 'GAP',
  TireWheel: 'Tire & Wheel',
  PaintProtection: 'Paint Protection',
  MaintenancePlan: 'Maintenance Plan',
  Other: 'Other',
};

export function FiProductTable({ products, catalog, onAdd, onEdit, onRemove, onChargeback, readOnly, dealDelivered }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [chargebackProductId, setChargebackProductId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const canWrite = !readOnly && !dealDelivered;

  const handleAdd = async (data: FiProductFormData) => {
    setActionLoading(true);
    await onAdd(data);
    setActionLoading(false);
    setShowAddForm(false);
  };

  const handleEdit = async (productId: string, data: FiProductFormData) => {
    setActionLoading(true);
    await onEdit(productId, data);
    setActionLoading(false);
    setEditingId(null);
  };

  const handleRemove = async (productId: string) => {
    if (!window.confirm('Remove this product from the deal?')) return;
    setActionLoading(true);
    await onRemove(productId);
    setActionLoading(false);
  };

  const handleChargeback = async (amount: number, date: string) => {
    if (!chargebackProductId) return;
    setActionLoading(true);
    await onChargeback(chargebackProductId, amount, date);
    setActionLoading(false);
    setChargebackProductId(null);
  };

  if (products.length === 0 && !showAddForm) {
    return (
      <div>
        <div style={{ padding: '24px', textAlign: 'center', color: '#757575' }}>
          No F&I products added yet.
        </div>
        {canWrite && (
          <button onClick={() => setShowAddForm(true)} style={addBtnStyle}>
            + Add Product
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={th}>Type</th>
              <th style={th}>Provider</th>
              <th style={th}>Cost</th>
              <th style={th}>Selling Price</th>
              <th style={th}>Gross</th>
              <th style={th}>Term</th>
              <th style={th}>Status</th>
              {!readOnly && <th style={th}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const gross = Number(product.sellingPrice) - Number(product.cost);
              const isEditing = editingId === product.id;
              return (
                <React.Fragment key={product.id}>
                  <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={td}>{PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}</td>
                    <td style={td}>{product.providerName}</td>
                    <td style={td}>${Number(product.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={td}>${Number(product.sellingPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ ...td, color: gross >= 0 ? '#1b5e20' : '#b71c1c', fontWeight: 600 }}>
                      {gross >= 0 ? '+' : ''}${gross.toFixed(2)}
                    </td>
                    <td style={td}>{product.termMonths} mo</td>
                    <td style={td}><FiProductStatusBadge status={product.status} /></td>
                    {!readOnly && (
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        {product.status === 'Active' && (
                          <>
                            {!dealDelivered && (
                              <>
                                <button onClick={() => setEditingId(isEditing ? null : product.id)} style={actionBtn}>
                                  {isEditing ? 'Cancel' : 'Edit'}
                                </button>
                                <button onClick={() => handleRemove(product.id)} style={{ ...actionBtn, color: '#d32f2f', marginLeft: 6 }} disabled={actionLoading}>
                                  Remove
                                </button>
                              </>
                            )}
                            <button onClick={() => setChargebackProductId(product.id)} style={{ ...actionBtn, marginLeft: 6, color: '#e65100' }}>
                              Chargeback
                            </button>
                          </>
                        )}
                        {product.status === 'ChargedBack' && product.chargebackAmount != null && (
                          <span style={{ fontSize: 12, color: '#880e4f' }}>
                            -${Number(product.chargebackAmount).toFixed(2)} on {product.chargebackDate}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                  {isEditing && (
                    <tr>
                      <td colSpan={readOnly ? 7 : 8} style={{ padding: 16, background: '#fafafa' }}>
                        <FiProductForm
                          catalog={catalog}
                          initial={product}
                          onSave={(data) => handleEdit(product.id, data)}
                          onCancel={() => setEditingId(null)}
                          loading={actionLoading}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {canWrite && !showAddForm && (
        <button onClick={() => setShowAddForm(true)} style={addBtnStyle}>
          + Add Product
        </button>
      )}

      {showAddForm && (
        <div style={{ padding: 16, border: '1px solid #e0e0e0', borderRadius: 10 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 15 }}>Add F&I Product</h4>
          <FiProductForm
            catalog={catalog}
            onSave={handleAdd}
            onCancel={() => setShowAddForm(false)}
            loading={actionLoading}
          />
        </div>
      )}

      {chargebackProductId && (
        <ChargebackForm
          onConfirm={handleChargeback}
          onCancel={() => setChargebackProductId(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e0e0e0' };
const td: React.CSSProperties = { padding: '10px 12px' };
const actionBtn: React.CSSProperties = { background: 'none', border: '1px solid #bdbdbd', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 };
const addBtnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: '1px dashed #1976d2', background: 'white', color: '#1976d2', cursor: 'pointer', fontWeight: 600 };
