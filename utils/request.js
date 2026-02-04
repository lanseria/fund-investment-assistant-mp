import axios from 'axios-miniprogram';
import Toast from '@vant/weapp/toast/toast';

// 基础配置
const baseURL = 'http://62.234.29.20:9999/api'; // 替换为你的真实API地址

const service = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求计数器，用于处理多个并发请求时的 Loading 状态
let requestCount = 0;

function showLoading() {
  if (requestCount === 0) {
    Toast.loading({
      message: '加载中...',
      forbidClick: true,
      duration: 0,
    });
  }
  requestCount++;
}

function hideLoading() {
  requestCount--;
  if (requestCount <= 0) {
    Toast.clear();
    requestCount = 0;
  }
}

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 自动显示加载状态 (除非显式设置 noLoading: true)
    if (!config.noLoading) {
      showLoading();
    }

    // 注入 Token
    // 注意：Web端使用 Cookie，小程序端建议在 Header 中携带
    const token = wx.getStorageSync('auth-token');
    if (token) {
      // 对应后端 server/middleware/auth.ts 中从 cookie 读取的逻辑
      // 这里可以根据后端调整为 'Authorization': `Bearer ${token}` 或直接传 Cookie 字符串
      config.headers['Authorization'] = `Bearer ${token}`;
      // 如果后端严格校验 Cookie，则需要这样模拟：
      config.headers['Cookie'] = `auth-token=${token}`;
    }

    return config;
  },
  (error) => {
    hideLoading();
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    hideLoading();

    // 如果返回 204 No Content 等成功状态
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }

    return response;
  },
  (error) => {
    hideLoading();

    const { status, data } = error.response || {};

    switch (status) {
      case 401:
        // Token 失效或未登录
        Toast.fail('会话已过期，请重新登录');
        wx.removeStorageSync('auth-token');
        wx.removeStorageSync('user-info');

        // 延迟跳转，让用户看清提示
        setTimeout(() => {
          const pages = getCurrentPages();
          const currentPage = pages[pages.length - 1];
          // 如果当前不是登录页，则跳转
          if (currentPage && currentPage.route !== 'pages/login/login') {
            wx.reLaunch({
              url: '/pages/login/login',
            });
          }
        }, 1500);
        break;

      case 403:
        Toast.fail('权限不足');
        break;

      case 500:
        Toast.fail('服务器内部错误');
        break;

      default:
        Toast.fail(data?.statusMessage || '网络请求失败');
        break;
    }

    return Promise.reject(error);
  }
);

export default service;