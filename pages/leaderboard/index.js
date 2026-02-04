import request from '../../utils/request';
import { formatCurrency } from '../../utils/format';
import Big from 'big.js';

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
        const formattedHoldings = res.map(h => ({
          ...h,
          holdingAmount: formatCurrency(h.holdingAmount),
          holdingProfitRate: h.holdingProfitRate ? h.holdingProfitRate.toFixed(2) : '0.00'
        }));
        this.setData({ userHoldings: formattedHoldings });
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.setData({ detailLoading: false });
    }
  }
});