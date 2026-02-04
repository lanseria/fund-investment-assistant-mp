import request from '../../utils/request';
import { formatCurrency } from '../../utils/format';
import Toast from '@vant/weapp/toast/toast';
import Dialog from '@vant/weapp/dialog/dialog';
import dayjs from 'dayjs';

Page({
  data: {
    selectedDate: dayjs().format('YYYY-MM-DD'),
    showCalendar: false,
    // 设置一个极广的日期范围
    minDate: new Date(2010, 0, 1).getTime(),
    maxDate: new Date(2035, 11, 31).getTime(),
    groupedTransactions: [],
    activeNames: [],
    hasPending: false,
    showImportModal: false,
    importJson: '',
    targetUser: null,
    isAdmin: false,
    currentUserId: null
  },

  onLoad() {
    const userInfo = wx.getStorageSync('user-info');
    this.setData({
      isAdmin: userInfo?.role === 'admin',
      currentUserId: userInfo?.id
    });
    this.fetchData();
  },

  onPullDownRefresh() {
    this.fetchData().then(() => wx.stopPullDownRefresh());
  },

  showCalendar() { this.setData({ showCalendar: true }); },
  onCalendarClose() { this.setData({ showCalendar: false }); },
  onCalendarConfirm(e) {
    // 点击日期后立即触发，不需要点击确认按钮
    const date = dayjs(e.detail).format('YYYY-MM-DD');
    this.setData({
      selectedDate: date,
      showCalendar: false
    }, () => {
      this.fetchData();
    });
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
              orderDetail: tx.orderAmount ? `¥${formatCurrency(tx.orderAmount)}` : `${parseFloat(tx.orderShares).toFixed(2)}份`,
              confirmedAmount: formatCurrency(tx.confirmedAmount)
            };
          });
          return group;
        });

        // 默认展开有交易的用户
        const activeNames = formatted
          .filter(g => g.txs.length > 0)
          .map(g => g.user.username);

        this.setData({
          groupedTransactions: formatted,
          hasPending,
          activeNames
        });
      }
    } catch (err) { console.error(err); }
  },

  getActionLabel(type) {
    const map = { buy: '买入', sell: '卖出', convert_in: '转入', convert_out: '转出' };
    return map[type] || type;
  },

  onCollapseChange(e) { this.setData({ activeNames: e.detail }); },

  // --- Web 端 handleCopyPrompt 逻辑迁移 ---
  async handleCopyPrompt(e) {
    const { user } = e.currentTarget.dataset;
    try {
      const res = await request({
        url: '/ai/prompt-preview',
        method: 'GET',
        data: { userId: user.id }
      });
      wx.setClipboardData({
        data: res.prompt,
        success: () => Toast.success('Prompt 已复制')
      });
    } catch (err) { Toast.fail('获取失败'); }
  },

  // --- 修正 JSON 逻辑 ---
  openImportModal(e) {
    const { user } = e.currentTarget.dataset;
    this.setData({ targetUser: user, showImportModal: true, importJson: '' });
  },

  onJsonChange(e) { this.setData({ importJson: e.detail }); },

  async handleImportSubmit() {
    if (!this.data.importJson) return;

    try {
      const parsed = JSON.parse(this.data.importJson);
      const decisions = Array.isArray(parsed) ? parsed : (parsed.decisions || []);

      await request({
        url: '/admin/transactions/batch-replace',
        method: 'POST',
        data: {
          userId: this.data.targetUser.id,
          date: this.data.selectedDate,
          decisions
        }
      });

      Toast.success('修正成功');
      this.fetchData();
    } catch (err) {
      Toast.fail('JSON 格式错误或提交失败');
    }
  },

  // --- 清空待处理 ---
  async handleClearPending() {
    Dialog.confirm({
      title: '清空确认',
      message: `确定要清空 ${this.data.selectedDate} 的所有待处理交易吗？`
    }).then(async () => {
      await request({
        url: '/transactions/daily',
        method: 'DELETE',
        data: { date: this.data.selectedDate }
      });
      Toast.success('已清空');
      this.fetchData();
    }).catch(() => { });
  }
});