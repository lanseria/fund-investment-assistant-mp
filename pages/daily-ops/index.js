import request from '~/utils/request';
import { formatCurrency } from '~/utils/format';
import dayjs from 'dayjs';

Page({
  data: {
    selectedDate: dayjs().format('YYYY-MM-DD'),
    showCalendar: false,
    minDate: new Date(2010, 0, 1).getTime(),
    maxDate: new Date(2035, 11, 31).getTime(),
    userList: [],
    loading: false,
    isToday: true,
  },

  onLoad() {
    this.checkIsToday();
    this.fetchData();
  },

  onPullDownRefresh() {
    this.fetchData().then(() => wx.stopPullDownRefresh());
  },

  checkIsToday() {
    const today = dayjs().format('YYYY-MM-DD');
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

  moveDate(e) {
    const { delta } = e.currentTarget.dataset;
    const newDate = dayjs(this.data.selectedDate).add(delta, 'day').format('YYYY-MM-DD');
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

  // 跳转到详情页
  goToDetail(e) {
    const { userId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/daily-ops/detail?date=${this.data.selectedDate}&userId=${userId}`,
    });
  },

  async fetchData() {
    this.setData({ loading: true });
    try {
      const res = await request({
        url: '/transactions/daily',
        method: 'GET',
        params: { date: this.data.selectedDate },
      });

      if (res) {
        const formatted = res.map(item => {
          // 格式化用户资产
          if (item.user?.stats?.totalAssets) {
            item.user.stats.totalAssets = formatCurrency(item.user.stats.totalAssets);
          }
          if (item.user?.stats?.cash) {
            item.user.stats.cash = formatCurrency(item.user.stats.cash);
          }
          if (item.user?.stats?.fundValue) {
            item.user.stats.fundValue = formatCurrency(item.user.stats.fundValue);
          }
          return item;
        });

        this.setData({
          userList: formatted,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.setData({ loading: false });
    }
  },
});
