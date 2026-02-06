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
    loading: false,
    isToday: true
  },

  onLoad() {
    this.checkIsToday();
    this.fetchData();
  },

  onPullDownRefresh() {
    this.fetchData().then(() => wx.stopPullDownRefresh());
  },

  // --- 日期控制逻辑 ---

  checkIsToday() {
    const today = dayjs().format('YYYY-MM-DD');
    console.log('today', today)
    console.log('this.data.selectedDate', this.data.selectedDate)
    this.setData({ isToday: this.data.selectedDate === today });
  },

  showCalendar() {
    this.setData({ showCalendar: true });
  },

  onCalendarClose() {
    this.setData({ showCalendar: false });
  },

  onCalendarConfirm(e) {
    const date = dayjs(e.detail).format('YYYY-MM-DD');
    this.setData({ selectedDate: date, showCalendar: false }, () => {
      this.checkIsToday();
      this.fetchData();
    });
  },

  // 左右切换日期
  moveDate(e) {
    const { delta } = e.currentTarget.dataset;
    const newDate = dayjs(this.data.selectedDate).add(delta, 'day').format('YYYY-MM-DD');

    // 如果是往后翻，且超过今天，阻止（可选逻辑，根据业务需求，这里暂不强行阻止，只控制样式）
    // if (delta > 0 && dayjs(newDate).isAfter(dayjs())) return;

    this.setData({ selectedDate: newDate }, () => {
      this.checkIsToday();
      this.fetchData();
    });
  },

  handleResetToday() {
    const today = dayjs().format('YYYY-MM-DD');
    if (this.data.selectedDate === today) return;

    this.setData({ selectedDate: today }, () => {
      this.checkIsToday();
      this.fetchData();
    });
  },

  // --- 数据获取 ---

  async fetchData() {
    this.setData({ loading: true });
    try {
      const res = await request({
        url: '/transactions/daily',
        method: 'GET',
        params: { date: this.data.selectedDate }
      });

      if (res) {
        const formatted = res.map(group => {
          // 格式化用户资产
          group.user.stats.totalAssets = formatCurrency(group.user.stats.totalAssets);

          // 格式化交易条目 (预计算视觉属性)
          group.txs = group.txs.map(tx => {
            const theme = this.getTxTheme(tx.type);

            // 决定显示金额还是份额
            let mainValue = '';
            let mainUnit = '';

            if (tx.orderAmount && parseFloat(tx.orderAmount) > 0) {
              mainValue = formatCurrency(tx.orderAmount);
              mainUnit = '¥';
            } else {
              // 修复：处理 orderShares 为 null (如转入待确认) 导致的 NaN
              const sharesRaw = parseFloat(tx.orderShares || 0);
              const shares = isNaN(sharesRaw) ? 0 : sharesRaw;

              // 如果是待确认且份额为0，显示占位符或 0.00
              mainValue = shares.toFixed(2);
              mainUnit = '份';
            }

            return {
              ...tx,
              time: dayjs(tx.createdAt).format('HH:mm'),
              theme, // 包含 color, icon, label, bgClass
              mainValue,
              mainUnit,
              statusText: tx.status === 'confirmed' ? '已确认' : '处理中',
              statusColor: tx.status === 'confirmed' ? 'text-hex-6B7280' : 'text-hex-F59E0B'
            };
          });
          return group;
        });

        this.setData({
          groupedTransactions: formatted
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 视觉映射逻辑 (仿 iOS switch case)
  getTxTheme(type) {
    switch (type) {
      case 'buy':
        return {
          icon: 'down', // 箭头向下（入库/买入）
          color: 'text-hex-EF4444',
          bg: 'bg-hex-FEF2F2',
          hex: '#EF4444',
          label: '买入'
        };
      case 'sell':
        return {
          icon: 'cart-o', // 箭头向上（出库/卖出）
          color: 'text-hex-22C55E',
          bg: 'bg-hex-F0FDF4',
          hex: '#22C55E',
          label: '卖出'
        };
      case 'convert_in':
        return {
          icon: 'add-o',
          color: 'text-hex-A855F7',
          bg: 'bg-hex-FAF5FF',
          hex: '#A855F7',
          label: '转入'
        };
      case 'convert_out':
        return {
          icon: 'revoke',
          color: 'text-hex-F97316',
          bg: 'bg-hex-FFF7ED',
          hex: '#F97316',
          label: '转出'
        };
      default:
        return {
          icon: 'question-o',
          color: 'text-hex-6B7280',
          bg: 'bg-hex-F3F4F6',
          hex: '#6B7280',
          label: type
        };
    }
  }
});