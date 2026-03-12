import request from '~/utils/request';
import { formatCurrency } from '~/utils/format';
import dayjs from 'dayjs';

Page({
  data: {
    date: '',
    userId: null,
    user: null,
    txs: [],
    loading: false,
  },

  onLoad(options) {
    const { date, userId } = options;
    this.setData({ date, userId: Number(userId) }, () => {
      wx.setNavigationBarTitle({
        title: dayjs(date).format('MM-DD') + ' 操作详情',
      });
      this.fetchData();
    });
  },

  onPullDownRefresh() {
    this.fetchData().then(() => wx.stopPullDownRefresh());
  },

  async fetchData() {
    this.setData({ loading: true });
    try {
      const res = await request({
        url: `/transactions/daily/${this.data.date}/${this.data.userId}`,
        method: 'GET',
      });

      if (res) {
        const formattedTxs = res.txs.map(tx => {
          const theme = this.getTxTheme(tx.type);

          let mainValue = '';
          let mainUnit = '';

          if (tx.orderAmount && parseFloat(tx.orderAmount) > 0) {
            mainValue = formatCurrency(tx.orderAmount);
            mainUnit = '¥';
          } else {
            const sharesRaw = parseFloat(tx.orderShares || 0);
            const shares = isNaN(sharesRaw) ? 0 : sharesRaw;
            mainValue = shares.toFixed(2);
            mainUnit = '份';
          }

          return {
            ...tx,
            time: dayjs(tx.createdAt).format('HH:mm'),
            theme,
            mainValue,
            mainUnit,
            statusText: tx.status === 'confirmed' ? '已确认' : '处理中',
            statusColor: tx.status === 'confirmed' ? 'text-hex-6B7280' : 'text-hex-F59E0B',
          };
        });

        this.setData({
          user: res.user,
          txs: formattedTxs,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.setData({ loading: false });
    }
  },

  getTxTheme(type) {
    switch (type) {
      case 'buy':
        return {
          icon: 'down',
          color: 'text-hex-EF4444',
          bg: 'bg-hex-FEF2F2',
          hex: '#EF4444',
          label: '买入',
        };
      case 'sell':
        return {
          icon: 'cart-o',
          color: 'text-hex-22C55E',
          bg: 'bg-hex-F0FDF4',
          hex: '#22C55E',
          label: '卖出',
        };
      case 'convert_in':
        return {
          icon: 'add-o',
          color: 'text-hex-A855F7',
          bg: 'bg-hex-FAF5FF',
          hex: '#A855F7',
          label: '转入',
        };
      case 'convert_out':
        return {
          icon: 'revoke',
          color: 'text-hex-F97316',
          bg: 'bg-hex-FFF7ED',
          hex: '#F97316',
          label: '转出',
        };
      default:
        return {
          icon: 'question-o',
          color: 'text-hex-6B7280',
          bg: 'bg-hex-F3F4F6',
          hex: '#6B7280',
          label: type,
        };
    }
  },
});
