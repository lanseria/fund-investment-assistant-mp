import request from '~/utils/request';
import { formatCurrency } from '~/utils/format';
import dayjs from 'dayjs';

Page({
  data: {
    selectedDate: dayjs().format('YYYY-MM-DD'),
    showCalendar: false,
    minDate: new Date(2010, 0, 1).getTime(),
    maxDate: new Date(2035, 11, 31).getTime(),
    groupedTransactions: [],
    activeNames: [], // 默认空数组，即全部收起
    hasPending: false
  },

  onLoad() {
    this.fetchData();
  },

  onPullDownRefresh() {
    this.fetchData().then(() => wx.stopPullDownRefresh());
  },

  showCalendar() {
    this.setData({
      showCalendar: true
    });
  },
  onCalendarClose() {
    this.setData({
      showCalendar: false
    });
  },

  onCalendarConfirm(e) {
    const date = dayjs(e.detail).format('YYYY-MM-DD');
    this.setData({
      selectedDate: date,
      showCalendar: false
    });
    this.fetchData();
  },

  async fetchData() {
    try {
      const res = await request({
        url: '/transactions/daily',
        method: 'GET',
        params: { date: this.data.selectedDate }
      });

      if (res) {
        let hasPending = false;
        const formatted = res.map(group => {
          // 格式化用户资产
          group.user.stats.totalAssets = formatCurrency(group.user.stats.totalAssets);
          group.user.stats.cash = formatCurrency(group.user.stats.cash);

          // 格式化交易条目
          group.txs = group.txs.map(tx => {
            if (tx.status === 'pending') hasPending = true;
            return {
              ...tx,
              time: dayjs(tx.createdAt).format('HH:mm:ss'),
              typeLabel: this.getActionLabel(tx.type),
              // 优化显示文本
              orderDetail: tx.orderAmount ? `¥${formatCurrency(tx.orderAmount)}` : `${parseFloat(tx.orderShares).toFixed(2)}份`,
              confirmedAmount: formatCurrency(tx.confirmedAmount)
            };
          });
          return group;
        });

        // 移除自动展开逻辑 (activeNames 保持当前状态或重置为空，此处选择保留用户当前交互状态或重置)
        // 如果想每次刷新都收起，解开下面注释；否则保留 data 中的 activeNames
        // this.setData({ activeNames: [] });

        this.setData({
          groupedTransactions: formatted,
          hasPending
        });
      }
    } catch (err) { console.error(err); }
  },

  getActionLabel(type) {
    const map = { buy: '买入', sell: '卖出', convert_in: '转入', convert_out: '转出' };
    return map[type] || type;
  },

  onCollapseChange(e) { this.setData({ activeNames: e.detail }); }
});