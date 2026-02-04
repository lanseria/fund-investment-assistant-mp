import request from '../../utils/request';
import { formatCurrency } from '../../utils/format';
import dayjs from 'dayjs';
import Big from 'big.js';

Page({
  data: {
    holdings: [],
    summary: {}
  },

  onShow() {
    this.initData();
  },

  async initData() {
    try {
      const res = await request({ url: '/fund/holdings/', method: 'GET' });
      if (res) {
        const formattedHoldings = res.holdings.map(item => {
          // --- 1. 计算今日估算收益额 (对应 Web 端逻辑) ---
          let todayProfitAmount = null;
          if (item.todayEstimateAmount && item.holdingAmount) {
            // 今日盈亏 = 今日预估总市值 - 昨日收盘总市值
            todayProfitAmount = new Big(item.todayEstimateAmount).minus(item.holdingAmount).toFixed(2);
          }

          // --- 2. 格式化其他金额 (持有收益额) ---
          const holdingProfitAmount = item.holdingProfitAmount ? formatCurrency(item.holdingProfitAmount) : '0.00';
          // 1. 计算安全持有状态 (7天规则)
          let lastBuyStatus = null;
          const recentBuys = item.recentTransactions.filter(t => t.type === 'buy' || t.type === 'convert_in');
          if (recentBuys.length > 0) {
            const lastBuyDate = dayjs(recentBuys[0].date);
            const diffDays = dayjs().diff(lastBuyDate, 'day');
            lastBuyStatus = {
              isSafe: diffDays >= 7,
              label: diffDays >= 7 ? '已满7天' : `持有${diffDays}天`
            };
          }

          // 2. 格式化近期交易圆点颜色
          const formattedRecentTxs = item.recentTransactions.map(tx => {
            let colorClass = 'bg-hex-9CA3AF'; // 默认灰色
            if (tx.type === 'buy') colorClass = 'bg-hex-EF4444';
            if (tx.type === 'sell') colorClass = 'bg-hex-22C55E';
            if (tx.type === 'convert_in') colorClass = 'bg-hex-A855F7'; // 紫色
            if (tx.type === 'convert_out') colorClass = 'bg-hex-3B82F6'; // 蓝色
            return { ...tx, colorClass };
          });

          // 3. 格式化待确认交易
          const pendingTransactions = (item.pendingTransactions || []).map(ptx => ({
            ...ptx,
            typeLabel: ptx.type === 'buy' ? '买入' : '卖出',
            displayValue: ptx.orderAmount ? `¥${ptx.orderAmount}` : `${ptx.orderShares}份`
          }));

          return {
            ...item,
            percentageChange: item.percentageChange ? item.percentageChange.toFixed(2) : '0.00',
            holdingAmount: formatCurrency(item.holdingAmount),
            holdingProfitAmount: holdingProfitAmount, // 持有收益额
            holdingProfitRate: item.holdingProfitRate ? item.holdingProfitRate.toFixed(2) : '0.00',
            todayProfitAmount: todayProfitAmount, // 今日估值收益额
            lastBuyStatus,
            formattedRecentTxs,
            pendingTransactions
          };
        });

        this.setData({
          holdings: formattedHoldings,
          'summary.totalEstimateAmount': formatCurrency(res.summary.totalEstimateAmount),
          'summary.totalProfitLoss': formatCurrency(res.summary.totalProfitLoss),
          'summary.totalPercentageChange': res.summary.totalPercentageChange.toFixed(2)
        });
      }
    } catch (err) {
      console.error(err);
    }
  },

  toDetail(e) {
    const { code } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/fund/detail?code=${code}` });
  }
});