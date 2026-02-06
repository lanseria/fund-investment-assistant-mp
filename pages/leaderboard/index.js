import request from '~/utils/request';
import { formatCurrency } from '~/utils/format';
import { getDictLabel } from '~/utils/dict';
import Big from 'big.js';
import dayjs from 'dayjs';

Page({
  data: {
    activePeriod: '1d',
    leaderboard: [],
    loading: false,
    expandedId: null,
    userHoldings: [],
    detailLoading: false
  },

  onLoad() {
    this.fetchData();
  },

  onPullDownRefresh() {
    this.fetchData().then(() => wx.stopPullDownRefresh());
  },

  // 切换统计周期
  onPeriodChange(e) {
    this.setData({
      activePeriod: e.detail.name,
      expandedId: null // 切换周期时重置展开状态
    });
    console.warn('切换周期：', e.detail.name);
    this.fetchData();
  },

  // 获取排行数据
  async fetchData() {
    this.setData({ loading: true });
    try {
      const res = await request({
        url: '/leaderboard',
        method: 'GET',
        params: { period: this.data.activePeriod }
      });

      if (res) {
        // 数据预处理：计算资产百分比
        const formatted = res.map(item => {
          const total = new Big(item.totalAssets || 0);
          let fundPercent = 0;
          if (total.gt(0)) {
            fundPercent = new Big(item.fundValue).div(total).times(100).toFixed(1);
          }

          return {
            ...item,
            totalAssets: formatCurrency(item.totalAssets),
            periodProfit: formatCurrency(item.periodProfit),
            periodProfitRate: item.periodProfitRate.toFixed(2),
            fundPercent: parseFloat(fundPercent),
            cashPercent: 100 - parseFloat(fundPercent)
          };
        });

        this.setData({ leaderboard: formatted });
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 展开/收起详情
  async toggleExpand(e) {
    const { userId } = e.currentTarget.dataset;

    if (this.data.expandedId === userId) {
      this.setData({ expandedId: null });
      return;
    }

    this.setData({
      expandedId: userId,
      detailLoading: true,
      userHoldings: []
    });

    try {
      // 对应 Web 端 Leaderboard 详情 API
      const res = await request({
        url: `/leaderboard/${userId}`,
        method: 'GET',
        noLoading: true
      });

      if (res) {
        // 数据处理逻辑，对齐 pages/holdings/index.js
        const formattedHoldings = res.map(item => {
          // 1. 数值计算准备
          const holdingAmt = new Big(item.holdingAmount || 0);
          const todayEstAmt = new Big(item.todayEstimateAmount || 0);

          // 计算今日盈亏: 今日估值 - 昨日市值(即holdingAmount)
          // 接口给出的 holdingAmount 是昨日市值，todayEstimateAmount 是今日估值
          const todayProfitAmount = todayEstAmt.minus(holdingAmt);

          // 2. 7天持有状态逻辑
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

          // 3. 交易热点图颜色映射
          const formattedRecentTxs = (item.recentTransactions || []).slice(0, 5).map(tx => {
            let colorClass = 'bg-hex-D1D5DB';
            if (tx.type === 'buy') colorClass = 'bg-hex-EF4444';
            if (tx.type === 'sell') colorClass = 'bg-hex-22C55E';
            if (tx.type === 'convert_in') colorClass = 'bg-hex-A855F7';
            return { ...tx, colorClass };
          });

          return {
            name: item.name,
            code: item.code,
            // 字典转换
            sectorLabel: getDictLabel('sectors', item.sector),

            // 格式化金额字段
            holdingAmount: formatCurrency(item.holdingAmount),
            holdingProfitAmount: formatCurrency(item.holdingProfitAmount),
            todayProfitAmount: formatCurrency(todayProfitAmount),

            // 原始数值 (用于颜色判断)
            holdingAmountRaw: Number(item.holdingAmount),
            holdingProfitAmountRaw: Number(item.holdingProfitAmount),
            todayProfitAmountRaw: Number(todayProfitAmount),
            percentageChangeRaw: Number(item.percentageChange || 0),
            holdingProfitRateRaw: Number(item.holdingProfitRate || 0),

            // 百分比格式化
            percentageChange: item.percentageChange ? item.percentageChange.toFixed(2) : '0.00',
            holdingProfitRate: item.holdingProfitRate ? item.holdingProfitRate.toFixed(2) : '0.00',

            // 辅助对象
            formattedRecentTxs,
            lastBuyStatus,
            pendingTransactions: (item.pendingTransactions || []).map(ptx => ({
              ...ptx,
              typeLabel: ptx.type === 'buy' ? '买入' : '卖出'
            }))
          };
        });

        this.setData({ userHoldings: formattedHoldings });
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.setData({ detailLoading: false });
    }
  }
});