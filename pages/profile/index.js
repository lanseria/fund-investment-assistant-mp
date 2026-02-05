import request from '../../utils/request';
import { formatCurrency } from '../../utils/format';
import Dialog from '@vant/weapp/dialog/dialog';
import Toast from '@vant/weapp/toast/toast';

Page({
  data: {
    user: {
      id: '',
      username: '',
      role: '',
      availableCash: '0.00',
      isAiAgent: false
    },
    loading: false
  },

  onShow() {
    this.fetchUserInfo();
  },

  async fetchUserInfo() {
    try {
      const res = await request({ url: '/auth/me', method: 'GET', noLoading: true });
      if (res) {
        this.setData({
          'user.id': res.id,
          'user.username': res.username,
          'user.role': res.role,
          'user.isAiAgent': res.isAiAgent,
          'user.availableCash': formatCurrency(res.availableCash)
        });
      }
    } catch (err) { console.error(err); }
  },

  // --- AI 开关逻辑 ---
  onAiSwitchChange({ detail }) {
    const action = detail ? '开启' : '关闭';
    Dialog.confirm({
      title: `${action}智能助手`,
      message: `确定要${action} AI 自动操作功能吗？\n开启后将在交易日 14:40 自动执行分析与下单。`,
      confirmButtonText: '确定执行',
      confirmButtonColor: '#0D9488'
    }).then(async () => {
      this.setData({ loading: true });
      try {
        await request({
          url: '/user/ai-status',
          method: 'PUT',
          data: { isAiAgent: detail }
        });
        this.setData({ 'user.isAiAgent': detail });
        Toast.success('设置已同步');
      } catch (e) {
        // 失败回滚开关状态
        this.setData({ 'user.isAiAgent': !detail });
      } finally {
        this.setData({ loading: false });
      }
    }).catch(() => {
      // 取消操作，开关状态复原（Vant Switch 需要手动控制）
      this.setData({ 'user.isAiAgent': !detail });
      this.fetchUserInfo();
    });
  },

  handleLogout() {
    Dialog.confirm({
      title: '退出登录',
      message: '确定要退出当前账号吗？',
      confirmButtonColor: '#EF4444'
    }).then(async () => {
      wx.removeStorageSync('auth-token');
      wx.removeStorageSync('user-info');
      wx.reLaunch({ url: '/pages/login/login' });
    }).catch(() => { });
  }
});