import request from '~/utils/request';
import { formatCurrency } from '~/utils/format';
import { getDictLabel } from '~/utils/dict';
import dayjs from 'dayjs';
import Big from 'big.js';

Page({
  data: {
    holdings: [],
    holdingsRaw: [],
    summary: {
      totalEstimateAmount: '0.00',
      totalProfitLoss: '0.00',
      totalPercentageChange: '0.00',
      totalHoldingAmount: '0.00' // 新增：昨日市值
    },
    indices: [],
    sortBy: 'holdingAmount',
    sortOrder: 'desc'
  },

  onShow() {
    this.initData();
  },

  async initData() {
    try {
      const [res] = await Promise.all([
        request({ url: '/fund/holdings/', method: 'GET' }),
        this.loadMarket()
      ]);
      if (res) {
        // 1. 处理列表数据
        const formattedHoldings = (res.holdings || []).map(item => {
          // 安全转换 Big Number
          const holdingAmountRaw = Number(item.holdingAmount || 0);
          const holdingAmt = new Big(holdingAmountRaw);
          const todayEstAmtRaw = Number(item.todayEstimateAmount || 0);
          const todayEstAmt = new Big(todayEstAmtRaw);
          const holdingSharesRaw = Number(item.holdingShares || 0);
          const holdingCostRaw = Number(item.holdingCost || 0);
          const watchFlags = Boolean(
            item.isWatchOnly || item.isWatch || item.isFollow || item.isFollowing || item.isFocus || item.isFavorite
          );
          const hasHolding = holdingAmountRaw > 0 || holdingSharesRaw > 0 || holdingCostRaw > 0;
          const isWatchOnly = watchFlags || !hasHolding;
          // 获取板块名称
          const sectorLabel = getDictLabel('sectors', item.sector);

          // 计算今日盈亏: 今日预估 - 昨日市值 (holdingAmount 在此接口中代表昨日市值)
          const todayProfitAmount = hasHolding ? todayEstAmt.minus(holdingAmt).toFixed(2) : null;
          const todayProfitAmountRaw = todayProfitAmount ? Number(todayProfitAmount) : 0;
          const percentageChangeRaw = Number(item.percentageChange || 0);
          const holdingProfitRateRaw = Number(item.holdingProfitRate || 0);

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
            sectorLabel,
            name: item.name,
            code: item.code,
            holdingAmount: formatCurrency(item.holdingAmount), // 持有市值 (昨日)
            holdingProfitAmount: formatCurrency(item.holdingProfitAmount), // 持有收益 (接口有返回)
            holdingProfitRate: item.holdingProfitRate ? item.holdingProfitRate.toFixed(2) : '0.00',
            todayProfitAmount: todayProfitAmount !== null ? formatCurrency(todayProfitAmount) : null,
            percentageChange: item.percentageChange ? item.percentageChange.toFixed(2) : '0.00',
            todayEstimateAmount: formatCurrency(item.todayEstimateAmount),
            holdingAmountRaw,
            todayProfitAmountRaw,
            percentageChangeRaw,
            holdingProfitRateRaw,
            isWatchOnly,
            lastBuyStatus,
            formattedRecentTxs,
            pendingTransactions: (item.pendingTransactions || []).map(ptx => ({
              ...ptx,
              typeLabel: ptx.type === 'buy' ? '买入' : '卖出'
            }))
          };
        });

        // 2. 处理汇总数据
        const sortedHoldings = this.getSortedHoldings(formattedHoldings);
        this.setData({
          holdingsRaw: formattedHoldings,
          holdings: sortedHoldings,
          summary: {
            count: res.summary.count || formattedHoldings.length,
            totalEstimateAmount: formatCurrency(res.summary.totalEstimateAmount),
            totalProfitLoss: formatCurrency(res.summary.totalProfitLoss),
            totalPercentageChange: res.summary.totalPercentageChange ? res.summary.totalPercentageChange.toFixed(2) : '0.00',
            totalHoldingAmount: formatCurrency(res.summary.totalHoldingAmount)
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  },

  getSortedHoldings(list) {
    const { sortBy, sortOrder } = this.data;
    const factor = sortOrder === 'asc' ? 1 : -1;
    const getValue = (item) => {
      switch (sortBy) {
        case 'todayChange':
          return Number(item.percentageChangeRaw || 0);
        case 'totalProfitRate':
          return Number(item.holdingProfitRateRaw || 0);
        case 'holdingAmount':
        default:
          return Number(item.holdingAmountRaw || 0);
      }
    };

    return [...list].sort((a, b) => {
      const diff = getValue(a) - getValue(b);
      if (diff !== 0) return diff * factor;
      return (Number(a.holdingAmountRaw || 0) - Number(b.holdingAmountRaw || 0)) * factor;
    });
  },

  onSortTap(e) {
    const { sort } = e.currentTarget.dataset;
    let sortOrder = 'desc';
    if (this.data.sortBy === sort) {
      sortOrder = this.data.sortOrder === 'desc' ? 'asc' : 'desc';
    }
    this.setData({
      sortBy: sort,
      sortOrder,
      holdings: this.getSortedHoldings(this.data.holdingsRaw)
    });
  },

  async loadMarket() {
    try {
      const marketRes = await request({ url: '/market/', method: 'GET' });
      if (marketRes) {
        const indices = Object.values(marketRes || {}).map(item => ({
          ...item
        }));
        this.setData({ indices });
      }
    } catch (err) {
      console.error(err);
    }
  },

  toDetail(e) {
    const { code } = e.currentTarget.dataset;

    // 1. 从原始数据中查找，以获取未经格式化的数值
    const rawItem = this.data.holdingsRaw.find(item => item.code === code);

    if (rawItem) {
      // 2. 构造精简的负载对象 (只传详情页需要的字段)
      const payload = {
        name: rawItem.name,
        code: rawItem.code,
        sector: rawItem.sector, // 原始板块值，用于在详情页转义
        holdingAmount: rawItem.holdingAmount, // 原始数值
        percentageChange: rawItem.percentageChange,
        holdingProfitRate: rawItem.holdingProfitRate,
        // 优先取今日估值 NAV，没有则取昨日 NAV
        nav: rawItem.todayEstimateNav || rawItem.yesterdayNav,
        isEstimateRealtime: !!rawItem.todayEstimateNav
      };

      // 3. 序列化对象
      const dataStr = encodeURIComponent(JSON.stringify(payload));

      // 4. 跳转
      wx.navigateTo({ url: `/pages/fund/detail/index?code=${code}&data=${dataStr}` });
    } else {
      // 容错处理
      wx.navigateTo({ url: `/pages/fund/detail/index?code=${code}` });
    }
  }
});