import request from '../../utils/request';
import { formatCurrency } from '../../utils/format';
import Dialog from '@vant/weapp/dialog/dialog';
import Toast from '@vant/weapp/toast/toast';
import Big from 'big.js';

Page({
  data: {
    user: {
      id: '',
      username: '',
      role: '',
      availableCash: '0.00',
      isAiAgent: false,
      aiSystemPrompt: ''
    },
    activeCollapse: [],
    showCashEdit: false,
    tempCash: '',
    generatedToken: '',
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
          'user.aiSystemPrompt': res.aiSystemPrompt || '',
          'user.availableCash': formatCurrency(res.availableCash)
        });
      }
    } catch (err) { console.error(err); }
  },

  // --- 现金编辑逻辑 ---
  openCashEdit() {
    this.setData({
      showCashEdit: true,
      tempCash: this.data.user.availableCash.replace(/,/g, '')
    });
  },

  onTempCashChange(e) { this.setData({ tempCash: e.detail }); },

  async confirmCashEdit() {
    const amount = parseFloat(this.data.tempCash);
    if (isNaN(amount) || amount < 0) {
      Toast.fail('请输入有效金额');
      return;
    }

    try {
      await request({
        url: '/user/ai-status',
        method: 'PUT',
        data: { availableCash: amount }
      });
      Toast.success('余额已更新');
      this.fetchUserInfo();
    } catch (err) { Toast.fail('更新失败'); }
  },

  // --- AI 配置逻辑 ---
  onAiSwitchChange({ detail }) {
    Dialog.confirm({
      title: '提示',
      message: `确定要${detail ? '开启' : '关闭'} AI 自动操作功能吗？`,
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
      } finally {
        this.setData({ loading: false });
      }
    }).catch(() => { });
  },

  onCollapseChange(e) { this.setData({ activeCollapse: e.detail }); },
  onPromptChange(e) { this.setData({ 'user.aiSystemPrompt': e.detail }); },

  async saveAiConfig() {
    this.setData({ loading: true });
    try {
      await request({
        url: '/user/ai-status',
        method: 'PUT',
        data: { aiSystemPrompt: this.data.user.aiSystemPrompt }
      });
      Toast.success('配置已保存');
    } finally {
      this.setData({ loading: false });
    }
  },

  copyDefaultPrompt() {
    const template = "你是一位资深量化策略分析师..."; // 对应 Web 端 DEFAULT_PROMPT_TEMPLATE
    this.setData({ 'user.aiSystemPrompt': template });
  },

  // --- API Token 逻辑 ---
  async handleGenerateToken() {
    Dialog.confirm({
      title: '生成新 Token',
      message: '生成新 Token 将导致旧 Token 立即失效。确定继续吗？',
    }).then(async () => {
      try {
        const res = await request({ url: '/user/api-token', method: 'POST' });
        this.setData({ generatedToken: res.token });
        Toast.success('Token 已生成');
      } catch (err) { Toast.fail('生成失败'); }
    }).catch(() => { });
  },

  copyToken() {
    wx.setClipboardData({
      data: this.data.generatedToken,
      success: () => Toast.success('已复制到剪贴板')
    });
  },

  handleLogout() {
    Dialog.confirm({ title: '提示', message: '确定要退出登录吗？' }).then(async () => {
      wx.removeStorageSync('auth-token');
      wx.removeStorageSync('user-info');
      wx.reLaunch({ url: '/pages/login/login' });
    }).catch(() => { });
  }
});