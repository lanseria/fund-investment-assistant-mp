import request from '../../utils/request';
import { formatCurrency } from '../../utils/format';
import dayjs from 'dayjs';
import Big from 'big.js';

Page({
  data: {
    holdings: [],
    summary: {
      totalEstimateAmount: '0.00',
      totalProfitLoss: '0.00',
      totalPercentageChange: '0.00',
      totalHoldingAmount: '0.00' // 新增：昨日市值
    },
    indices: [ // 模拟指数数据，因为接口没提供，保留之前的 mock 或空
      { name: '上证指数', value: '3065.23', changeRate: 1.25 },
      { name: '纳斯达克', value: '16250.5', changeRate: -0.85 },
      { name: '黄金现货', value: '540.20', changeRate: 0.45 }
    ]
  },

  onShow() {
    this.initData();
  },

  async initData() {
    try {
      const res = await request({ url: '/fund/holdings/', method: 'GET' });
      if (res) {
        // 1. 处理列表数据
        const formattedHoldings = (res.holdings || []).map(item => {
          // 安全转换 Big Number
          const holdingAmt = new Big(item.holdingAmount || 0);
          const todayEstAmt = new Big(item.todayEstimateAmount || 0);

          // 计算今日盈亏: 今日预估 - 昨日市值 (holdingAmount 在此接口中代表昨日市值)
          const todayProfitAmount = todayEstAmt.minus(holdingAmt).toFixed(2);

          // 7天持有状态逻辑
          let lastBuyStatus = null;
          const recentBuys = (item.recentTransactions || []).filter(t => t.type === 'buy' || t.type === 'convert_in');
          if (recentBuys.length > 0) {
            const lastBuyDate = dayjs(recentBuys[0].date);
            const diffDays = dayjs().diff(lastBuyDate, 'day');
            lastBuyStatus = {
              isSafe: diffDays >= 7,
              label: diffDays >= 7 ? '已满7天' : `持有${diffDays}天`
            };
          }

          // 交易热点图颜色映射
          const formattedRecentTxs = (item.recentTransactions || []).slice(0, 5).map(tx => {
            let colorClass = 'bg-hex-D1D5DB';
            if (tx.type === 'buy') colorClass = 'bg-hex-EF4444';
            if (tx.type === 'sell') colorClass = 'bg-hex-22C55E';
            if (tx.type === 'convert_in') colorClass = 'bg-hex-A855F7';
            return { ...tx, colorClass };
          });

          return {
            ...item,
            name: item.name,
            code: item.code,
            holdingAmount: formatCurrency(item.holdingAmount), // 持有市值 (昨日)
            holdingProfitAmount: formatCurrency(item.holdingProfitAmount), // 持有收益 (接口有返回)
            holdingProfitRate: item.holdingProfitRate ? item.holdingProfitRate.toFixed(2) : '0.00',
            todayProfitAmount: formatCurrency(todayProfitAmount),
            percentageChange: item.percentageChange ? item.percentageChange.toFixed(2) : '0.00',
            todayEstimateAmount: formatCurrency(item.todayEstimateAmount),
            lastBuyStatus,
            formattedRecentTxs,
            pendingTransactions: (item.pendingTransactions || []).map(ptx => ({
              ...ptx,
              typeLabel: ptx.type === 'buy' ? '买入' : '卖出'
            }))
          };
        });

        // 2. 处理汇总数据
        const summaryData = res.summary || {};
        this.setData({
          holdings: formattedHoldings,
          summary: {
            totalEstimateAmount: formatCurrency(summaryData.totalEstimateAmount),
            totalProfitLoss: formatCurrency(summaryData.totalProfitLoss),
            totalPercentageChange: summaryData.totalPercentageChange ? summaryData.totalPercentageChange.toFixed(2) : '0.00',
            // 使用昨日市值替换原来的持有收益位置
            totalHoldingAmount: formatCurrency(summaryData.totalHoldingAmount)
          }
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