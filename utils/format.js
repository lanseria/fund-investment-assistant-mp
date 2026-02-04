import Big from 'big.js';

/**
 * 格式化金额
 * @param {string|number} val 
 * @param {number} decimals 保留小数位，默认2
 */
export const formatCurrency = (val, decimals = 2) => {
  if (val === null || val === undefined || isNaN(parseFloat(val))) {
    return '0.00';
  }
  return new Big(val).toFixed(decimals);
};