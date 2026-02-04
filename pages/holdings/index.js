import request from '../../utils/request';

Page({
  data: {
    holdings: [],
    summary: {},
    indices: [], // 对应 Web 的 MarketOverview
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

      this.setData({
        holdings: res.holdings,
        summary: res.summary
      });

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