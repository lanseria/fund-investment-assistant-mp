import request from '../../utils/request';
import { formatCurrency } from '../../utils/format'; // 引入工具

Page({
  data: {
    holdings: [],
    summary: {
      totalEstimateAmount: '0.00',
      totalProfitLoss: '0.00',
      totalPercentageChange: '0.00'
    },
    indices: [],
    refreshing: false
  },

  onShow() {
    // 每次进入页面刷新数据（模拟 Pinia 的获取逻辑）
    this.initData();
  },

  async initData() {
    try {
      // 1. 获取持仓列表
      const res = await request({
        url: '/fund/holdings/',
        method: 'GET'
      });

      if (res) {
        // 1. 格式化汇总数据 (Summary Card)
        const formattedSummary = {
          totalEstimateAmount: formatCurrency(res.summary.totalEstimateAmount),
          totalProfitLoss: formatCurrency(res.summary.totalProfitLoss),
          totalPercentageChange: formatCurrency(res.summary.totalPercentageChange)
        };

        // 2. 格式化持仓列表 (Holdings List)
        const formattedHoldings = res.holdings.map(item => {
          return {
            ...item,
            // 涨跌幅保留 2 位
            percentageChange: formatCurrency(item.percentageChange),
            // 市值保留 2 位
            holdingAmount: formatCurrency(item.holdingAmount),
            // 持有收益保留 2 位
            holdingProfitAmount: formatCurrency(item.holdingProfitAmount),
            // 净值类数据通常 Web 端保留 4 位，小程序看你需求，这里建议 4 位
            yesterdayNav: formatCurrency(item.yesterdayNav, 4)
          };
        });

        this.setData({
          summary: formattedSummary,
          holdings: formattedHoldings
        });
      }

      // 2. 获取行情指数 (简化处理，实际可以从 sse 改为轮询或初次加载)
      // 备注：由于小程序不支持 SSE 效果好，我们通常采用初次进入加载 + 下拉刷新
      this.fetchMarketIndices();
    } catch (err) {
      console.error(err);
    }
  },

  async fetchMarketIndices() {
    // 模拟从缓存或接口获取指数数据
    // 对应 Web 端 shared/market.ts 里的 codes
    // 这里需要根据你的后端接口调整
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.initData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onAddFund() {
    // 跳转添加页面
    wx.navigateTo({ url: '/pages/fund-add/index' });
  },

  toDetail(e) {
    const { code } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/fund-detail/index?code=${code}` });
  }
});