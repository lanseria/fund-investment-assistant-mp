import request from './request';

// 缓存 key
const STORAGE_KEY = 'app_dicts';
// 内存缓存
let dictCache = wx.getStorageSync(STORAGE_KEY) || {};

/**
 * 加载所有字典数据 (对应 iOS DictManager.loadAllDicts)
 */
export const loadDicts = async () => {
  try {
    const res = await request({ url: '/dicts/all', method: 'GET' });
    if (res) {
      dictCache = res;
      wx.setStorageSync(STORAGE_KEY, res);
      console.log('✅ 字典数据加载完成');
    }
  } catch (err) {
    console.error('❌ 加载字典失败:', err);
  }
};

/**
 * 获取标签 (对应 iOS DictManager.getLabel)
 * @param {string} type 字典类型 (如 'sectors')
 * @param {string} value 字典值 (如 'consumption')
 */
export const getDictLabel = (type, value) => {
  if (!value) return '';
  const items = dictCache[type] || [];
  const target = items.find(item => item.value === value);
  return target ? target.label : value;
};