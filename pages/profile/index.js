import request from '../../utils/request';
import { formatCurrency } from '../../utils/format';
import Dialog from '@vant/weapp/dialog/dialog';
import Toast from '@vant/weapp/toast/toast';

Page({
  data: {
    user: {
      username: '',
      role: '',
      id: '',
      // 这里的初始值保持字符串，方便直接展示
      availableCash: '0.00',
      isAiAgent: false
    }
  },

  onShow() {
    this.fetchUserInfo();
  },

  async fetchUserInfo() {
    try {
      const res = await request({
        url: '/auth/me',
        method: 'GET',
        noLoading: true
      });

      if (res) {
        // --- 核心修改：在 setData 前进行高精度格式化 ---
        const formattedUser = {
          ...res,
          // 确保可用现金保留 2 位小数
          'user.availableCash': formatCurrency(res.availableCash)
        };

        this.setData({ user: formattedUser });
        wx.setStorageSync('user-info', formattedUser);
      }
    } catch (err) {
      console.error('获取用户信息失败', err);
    }
  },

  handleLogout() {
    Dialog.confirm({
      title: '提示',
      message: '确定要退出登录吗？',
      confirmButtonText: '退出',
      cancelButtonColor: '#EF4444',
    }).then(async () => {
      try {
        await request({ url: '/auth/logout', method: 'POST' });
      } catch (err) {
        console.warn('后端登出失败', err);
      } finally {
        wx.removeStorageSync('auth-token');
        wx.removeStorageSync('user-info');
        Toast.success('已安全退出');
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/login/login' });
        }, 1000);
      }
    }).catch(() => { });
  },
});