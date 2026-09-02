export interface LineDiscountParams {
  productName?: string;
  unitPrice: number;
  quantity: number;
  discountType?: 'percentage' | 'amount';
  discountScope?: 'per_unit' | 'total' | 'total_qty';
  discountValue?: number | string;
  minPrice?: number;
  costPrice?: number;
  actualSoldPrice?: number;
}

export interface LineDiscountValidationResult {
  isValid: boolean;
  error?: string;
  discountAmount: number;
  effectiveUnitPrice: number;
  minPrice: number;
  maxAllowedDiscount: number;
  maxAllowedPercentage: number;
}

export interface OverallDiscountParams {
  items: Array<{
    productName?: string;
    unitPrice: number;
    quantity: number;
    discountAmount?: number;
    minPrice?: number;
    costPrice?: number;
    actualSoldPrice?: number;
  }>;
  totalDiscountType?: 'percentage' | 'amount';
  totalDiscountValue?: number | string;
}

export interface OverallDiscountValidationResult {
  isValid: boolean;
  error?: string;
  overallDiscountAmount: number;
  finalTotal: number;
  minTotal: number;
  maxAllowedOverallDiscount: number;
  maxAllowedOverallPercentage: number;
}

/**
 * Resolves the minimum allowed price floor for an item.
 * Uses actualSoldPrice if set and > 0, otherwise purchasePrice/costPrice, or 0.
 */
export function resolveMinPrice(item: {
  minPrice?: number;
  actualSoldPrice?: number;
  purchasePrice?: number;
  costPrice?: number;
}): number {
  if (item.minPrice !== undefined && Number(item.minPrice) > 0) {
    return Number(item.minPrice);
  }
  if (item.actualSoldPrice !== undefined && Number(item.actualSoldPrice) > 0) {
    return Number(item.actualSoldPrice);
  }
  if (item.purchasePrice !== undefined && Number(item.purchasePrice) > 0) {
    return Number(item.purchasePrice);
  }
  if (item.costPrice !== undefined && Number(item.costPrice) > 0) {
    return Number(item.costPrice);
  }
  return 0;
}

/**
 * Validates a single item line discount against minimum allowed selling price.
 */
export function validateLineDiscount(params: LineDiscountParams): LineDiscountValidationResult {
  const qty = Math.max(1, Number(params.quantity) || 1);
  const unitPrice = Number(params.unitPrice) || 0;
  const minPrice = resolveMinPrice(params);
  const discType = params.discountType || 'percentage';
  const discScope = params.discountScope === 'total' || params.discountScope === 'total_qty' ? 'total' : 'per_unit';
  const discVal = Math.max(0, Number(params.discountValue) || 0);
  const subtotal = qty * unitPrice;
  const name = params.productName ? `"${params.productName}"` : 'Item';

  let discountAmount = 0;
  let effectiveUnitPrice = unitPrice;

  if (discVal > 0 && unitPrice > 0) {
    if (discType === 'percentage') {
      if (discVal > 100) {
        return {
          isValid: false,
          error: `${name}: Discount percentage cannot exceed 100%`,
          discountAmount: subtotal,
          effectiveUnitPrice: 0,
          minPrice,
          maxAllowedDiscount: 0,
          maxAllowedPercentage: 0,
        };
      }
      if (discScope === 'per_unit') {
        discountAmount = unitPrice * (discVal / 100) * qty;
        effectiveUnitPrice = unitPrice * (1 - discVal / 100);
      } else {
        discountAmount = subtotal * (discVal / 100);
        effectiveUnitPrice = (subtotal - discountAmount) / qty;
      }
    } else {
      // Amount
      if (discScope === 'per_unit') {
        discountAmount = discVal * qty;
        effectiveUnitPrice = unitPrice - discVal;
      } else {
        discountAmount = discVal;
        effectiveUnitPrice = (subtotal - discVal) / qty;
      }
    }
  }

  const maxAllowedUnitDiscount = Math.max(0, unitPrice - minPrice);
  const maxAllowedTotalDiscount = maxAllowedUnitDiscount * qty;
  const maxAllowedPercentage = unitPrice > 0 ? Math.max(0, ((unitPrice - minPrice) / unitPrice) * 100) : 0;

  // Check if effective unit price is lower than minPrice (with small floating precision tolerance)
  const isBelowMin = minPrice > 0 && (effectiveUnitPrice < minPrice - 0.009);

  if (isBelowMin) {
    let errorMsg = '';
    const formattedEff = effectiveUnitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedMin = minPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (discType === 'percentage') {
      errorMsg = `${name}: Selling price (LKR ${formattedEff}) is below the minimum allowed price of LKR ${formattedMin}. Max allowed discount is ${maxAllowedPercentage.toFixed(1)}%.`;
    } else if (discScope === 'per_unit') {
      const formattedMaxUnit = maxAllowedUnitDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      errorMsg = `${name}: Selling price (LKR ${formattedEff}) is below the minimum allowed price of LKR ${formattedMin}. Max allowed discount is LKR ${formattedMaxUnit} per unit.`;
    } else {
      const formattedMaxTotal = maxAllowedTotalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      errorMsg = `${name}: Selling price (LKR ${formattedEff}) is below the minimum allowed price of LKR ${formattedMin}. Max allowed total discount is LKR ${formattedMaxTotal}.`;
    }

    return {
      isValid: false,
      error: errorMsg,
      discountAmount,
      effectiveUnitPrice,
      minPrice,
      maxAllowedDiscount: discScope === 'per_unit' ? maxAllowedUnitDiscount : maxAllowedTotalDiscount,
      maxAllowedPercentage,
    };
  }

  return {
    isValid: true,
    discountAmount,
    effectiveUnitPrice,
    minPrice,
    maxAllowedDiscount: discScope === 'per_unit' ? maxAllowedUnitDiscount : maxAllowedTotalDiscount,
    maxAllowedPercentage,
  };
}

/**
 * Validates overall order / quotation / invoice discount against total minimum price floor.
 */
export function validateOverallDiscount(params: OverallDiscountParams): OverallDiscountValidationResult {
  let subtotalAfterLineDiscounts = 0;
  let minTotal = 0;

  for (const it of params.items) {
    const qty = Math.max(1, Number(it.quantity) || 1);
    const unitPrice = Number(it.unitPrice) || 0;
    const lineDisc = Number(it.discountAmount) || 0;
    const lineMin = resolveMinPrice(it);

    subtotalAfterLineDiscounts += Math.max(0, (qty * unitPrice) - lineDisc);
    minTotal += lineMin * qty;
  }

  const discType = params.totalDiscountType || 'percentage';
  const discVal = Math.max(0, Number(params.totalDiscountValue) || 0);

  let overallDiscountAmount = 0;
  if (discVal > 0) {
    if (discType === 'percentage') {
      if (discVal > 100) {
        return {
          isValid: false,
          error: 'Total discount percentage cannot exceed 100%',
          overallDiscountAmount: subtotalAfterLineDiscounts,
          finalTotal: 0,
          minTotal,
          maxAllowedOverallDiscount: 0,
          maxAllowedOverallPercentage: 0,
        };
      }
      overallDiscountAmount = subtotalAfterLineDiscounts * (discVal / 100);
    } else {
      overallDiscountAmount = discVal;
    }
  }

  const finalTotal = subtotalAfterLineDiscounts - overallDiscountAmount;
  const maxAllowedOverallDiscount = Math.max(0, subtotalAfterLineDiscounts - minTotal);
  const maxAllowedOverallPercentage = subtotalAfterLineDiscounts > 0 ? Math.max(0, (maxAllowedOverallDiscount / subtotalAfterLineDiscounts) * 100) : 0;

  const isBelowMin = minTotal > 0 && (finalTotal < minTotal - 0.009);

  if (isBelowMin) {
    const formattedFinal = finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedMin = minTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let errorMsg = '';
    if (discType === 'percentage') {
      errorMsg = `Overall discount reduces total price (LKR ${formattedFinal}) below the minimum allowed total of LKR ${formattedMin}. Max allowed overall discount is ${maxAllowedOverallPercentage.toFixed(1)}%.`;
    } else {
      const formattedMax = maxAllowedOverallDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      errorMsg = `Overall discount reduces total price (LKR ${formattedFinal}) below the minimum allowed total of LKR ${formattedMin}. Max allowed overall discount is LKR ${formattedMax}.`;
    }

    return {
      isValid: false,
      error: errorMsg,
      overallDiscountAmount,
      finalTotal,
      minTotal,
      maxAllowedOverallDiscount,
      maxAllowedOverallPercentage,
    };
  }

  return {
    isValid: true,
    overallDiscountAmount,
    finalTotal,
    minTotal,
    maxAllowedOverallDiscount,
    maxAllowedOverallPercentage,
  };
}
