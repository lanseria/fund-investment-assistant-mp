import request from '../../utils/request';
import Toast from '@vant/weapp/toast/toast';

Page({
  data: {
    username: '',
    password: '',
    rememberMe: false,
    loading: false
  },

  onLoad() {
    // 检查本地是否有记住的账号
    const saved = wx.getStorageSync('saved_credentials');
    if (saved) {
      this.setData({
        username: saved.username,
        password: saved.password,
        rememberMe: true
      });
    }
  },

  onUsernameChange(e) { this.setData({ username: e.detail }); },
  onPasswordChange(e) { this.setData({ password: e.detail }); },
  onRememberChange(e) { this.setData({ rememberMe: e.detail }); },

  async handleLogin() {
    const { username, password, rememberMe } = this.data;

    if (!username || !password) {
      Toast.fail('请完整填写信息');
      return;
    }

    this.setData({ loading: true });

    try {
      // 这里的 response 是 request.js 拦截器处理后的 data
      // 后端返回结构为 { user: { ... } }
      // 注意：由于后端在 Web 端是写 Cookie 的，小程序需要从 Header 拿或让后端返回 Token 字段
      // 这里我们假设后端适配了小程序，或者我们需要从响应头获取

      const res = await request({
        url: '/auth/login',
        method: 'POST',
        data: { username, password },
        // 告诉拦截器不要重复显示 Toast，因为页面按钮已经有 loading 态
        noLoading: true
      });


      if (res.user) {
        wx.setStorageSync('user-info', res.user);
        wx.setStorageSync('auth-token', res.token);

        // 2. 处理“记住我”
        if (rememberMe) {
          wx.setStorageSync('saved_credentials', { username, password });
        } else {
          wx.removeStorageSync('saved_credentials');
        }

        Toast.success('登录成功');

        // 3. 跳转到首页
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/holdings/index' });
        }, 1000);
      }
    } catch (err) {
      console.error('Login Error:', err);
      // 错误已在 request.js 拦截器统一提示
    } finally {
      this.setData({ loading: false });
    }
  }
});