import React from 'react';
import { FiProductTable } from '../components/FiProductTable';
import { FiGrossSummary } from '../components/FiGrossSummary';
import { useFiProducts } from '../hooks/useFiProducts';
import { FiErrorBoundary } from '../components/FiErrorBoundary';

interface Props {
  dealId: string;
  dealBackEndGross?: number;
  dealDelivered?: boolean;
  readOnly?: boolean;
}

function FiProductMenuPageInner({ dealId, dealBackEndGross, dealDelivered, readOnly }: Props) {
  const {
    products,
    catalog,
    totalFiGross,
    loading,
    error,
    addProduct,
    editProduct,
    removeProduct,
    recordChargeback,
  } = useFiProducts(dealId);

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
        Failed to load F&I products: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 20, color: '#212121' }}>F&I Product Menu</h2>

      <div style={{ marginBottom: 20 }}>
        <FiGrossSummary
          totalFiGross={parseFloat(totalFiGross as string) || 0}
          backEndGross={dealBackEndGross}
          productCount={products.filter((p) => p.status === 'Active').length}
        />
      </div>

      <FiProductTable
        products={products}
        catalog={catalog}
        onAdd={async (data) => { await addProduct(data as any); }}
        onEdit={async (id, data) => { await editProduct(id, data as any); }}
        onRemove={removeProduct}
        onChargeback={recordChargeback}
        readOnly={readOnly}
        dealDelivered={dealDelivered}
      />
    </div>
  );
}

export function FiProductMenuPage(props: Props) {
  return (
    <FiErrorBoundary pageName="the F&I product menu">
      <FiProductMenuPageInner {...props} />
    </FiErrorBoundary>
  );
}

const skeleton: React.CSSProperties = { height: 20, borderRadius: 4, background: '#e0e0e0' };
