import request from '~/utils/request';
import { formatCurrency } from '~/utils/format';
import { getDictLabel } from '~/utils/dict'; // 确保引入了字典工具
import Big from 'big.js';
import dayjs from 'dayjs';

Page({
  data: {
    code: '',
    loading: true, // 这里的 loading 主要控制 history 和 performance 的加载

    // 基本持仓信息
    holding: {
      name: '',
      code: '',
      percentageChange: 0,
      holdingAmount: null,
      holdingProfitRate: 0,
      currentNav: '0.0000',
    },
    hasHolding: false,
    estimatedDayProfit: '0.00',
    changeColorClass: {},

    // ... (图表相关配置保持不变) ...
    timeRanges: [
      { label: '1月', value: '1m', days: 22 },
      { label: '3月', value: '3m', days: 66 },
      { label: '6月', value: '6m', days: 130 },
      { label: '1年', value: '1y', days: 250 }
    ],
    activeRange: '1m',
    fullHistory: [],
    chartData: [],
    chartLoading: false,
    chartSelection: null,
    performanceItems: [],
    showTradeSheet: false
  },

  onLoad(options) {
    // 1. 优先处理路由传递的缓存数据 (同步渲染，无需 Loading)
    if (options.data) {
      try {
        const item = JSON.parse(decodeURIComponent(options.data));
        this.initFromRouteData(item);
      } catch (e) {
        console.error('解析路由参数失败', e);
      }
    }

    if (options.code) {
      this.setData({ code: options.code });
      // 2. 异步加载剩余数据 (图表 + 业绩)
      this.initAsyncData(options.code);
    }
  },

  // --- 新增：从路由数据初始化视图 ---
  initFromRouteData(data) {
    const holdingAmt = Number(data.holdingAmount || 0);
    const percent = Number(data.percentageChange || 0);

    // 计算预估盈亏: 持仓金额 * 涨跌幅%
    // 注意：这里的 holdingAmount 实际上是昨日市值，用它乘以今日涨跌幅得到今日预估盈亏
    const estProfit = holdingAmt > 0
      ? new Big(holdingAmt).times(percent).div(100).toFixed(2)
      : '0.00';

    const isUp = percent >= 0;

    // 颜色样式计算
    const colorSet = isUp ? {
      hex: '#EF4444',
      text: 'text-hex-EF4444',
      bg: 'bg-hex-EF4444',
      lightBg: 'bg-hex-FEF2F2'
    } : {
      hex: '#22C55E',
      text: 'text-hex-22C55E',
      bg: 'bg-hex-22C55E',
      lightBg: 'bg-hex-F0FDF4'
    };

    this.setData({
      hasHolding: holdingAmt > 0,
      estimatedDayProfit: formatCurrency(estProfit),
      changeColorClass: colorSet,
      holding: {
        name: data.name,
        code: data.code,
        // 如果路由传过来的是 sector value (如 'consumption')，转换成 Label
        sectorLabel: getDictLabel('sectors', data.sector),
        percentageChange: percent.toFixed(2),
        holdingAmount: formatCurrency(holdingAmt),
        holdingProfitRate: data.holdingProfitRate ? Number(data.holdingProfitRate).toFixed(2) : '0.00',
        currentNav: new Big(data.nav || 0).toFixed(4),
        isEstimateRealtime: data.isEstimateRealtime
      },
      // 基础信息已就绪，取消全局 loading（图表区有单独 loading）
      loading: false
    });
  },

  // --- 异步加载数据 (图表 & 业绩) ---
  async initAsyncData(code) {
    // 这里不再设置 this.setData({ loading: true })，以免覆盖掉已经渲染出的头部信息
    // 仅在图表区域显示加载态
    try {
      await Promise.all([
        this.fetchHistory(code),
        this.fetchPerformance(code)
      ]);
    } catch (err) {
      console.error(err);
    }
  },


  // 为了完整性，这里列出 fetchPerformance, fetchHistory 的引用
  async fetchPerformance(code) {
    try {
      const perf = await request({ url: `/fund/holdings/${code}/performance`, method: 'GET', noLoading: true });
      if (perf) {
        const performanceItems = [
          { label: '近1月', value: (perf['1m'] || 0).toFixed(2) },
          { label: '近3月', value: (perf['3m'] || 0).toFixed(2) },
          { label: '近6月', value: (perf['6m'] || 0).toFixed(2) },
          { label: '近1年', value: (perf['1y'] || 0).toFixed(2) },
          { label: '今年来', value: (perf['this_year'] || 0).toFixed(2) },
          { label: '成立来', value: (perf['all'] || 0).toFixed(2) },
        ];
        this.setData({ performanceItems });
      }
    } catch (e) { console.error(e); }
  },

  async fetchHistory(code) {
    this.setData({ chartLoading: true });
    try {
      const res = await request({ url: `/fund/holdings/${code}/history`, method: 'GET', noLoading: true });
      if (res && res.history) {
        this.setData({ fullHistory: res.history });
        this.updateChartData(this.data.activeRange);
      }
    } catch (e) { console.error(e); }
    finally { this.setData({ chartLoading: false }); }
  },


  // 仅补充 updateChartData 确保逻辑闭环
  updateChartData(rangeKey) {
    const { fullHistory, timeRanges } = this.data;
    if (!fullHistory.length) return;
    const rangeConfig = timeRanges.find(r => r.value === rangeKey);
    const limit = rangeConfig ? rangeConfig.days : 22;
    const slicedData = fullHistory.slice(-limit);
    this.setData({ chartData: slicedData });
    setTimeout(() => { this.renderChart(slicedData); }, 50);
  },

  renderChart(data) {
    const query = wx.createSelectorQuery().in(this);
    query.select('#historyChart').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      const width = res[0].width;
      const height = res[0].height;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }
      this.chartCtx = { canvas, ctx, width, height, data, dpr };
      if (!data.length) { ctx.clearRect(0, 0, width, height); return; }

      const navs = data.map(d => d.nav);
      const minVal = Math.min(...navs) * 0.995;
      const maxVal = Math.max(...navs) * 1.005;
      this.chartCtx.scaleY = (val) => height - ((val - minVal) / (maxVal - minVal)) * height;
      this.chartCtx.scaleX = (index) => (index / (data.length - 1)) * width;
      this.chartCtx.minVal = minVal;

      this.drawChartFrame(ctx, data, width, height);
    });
  },

  drawChartFrame(ctx, data, width, height) {
    const { scaleX, scaleY } = this.chartCtx;
    ctx.clearRect(0, 0, width, height);
    if (data.length < 2) return;

    // 渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
    ctx.beginPath();
    ctx.moveTo(0, height);
    data.forEach((item, index) => ctx.lineTo(scaleX(index), scaleY(item.nav)));
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 折线
    ctx.beginPath();
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    data.forEach((item, index) => {
      if (index === 0) ctx.moveTo(scaleX(index), scaleY(item.nav));
      else ctx.lineTo(scaleX(index), scaleY(item.nav));
    });
    ctx.stroke();
  },

  onChartTouch(e) {
    if (!this.chartCtx) return;
    const { x } = e.touches[0];
    const { width, height, data, scaleX, scaleY, ctx } = this.chartCtx;
    let index = Math.round((x / width) * (data.length - 1));
    index = Math.max(0, Math.min(index, data.length - 1));
    const target = data[index];
    const targetX = scaleX(index);
    const targetY = scaleY(target.nav);

    this.drawChartFrame(ctx, data, width, height);
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 1;
    ctx.moveTo(targetX, 0);
    ctx.lineTo(targetX, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(targetX, targetY, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#EF4444';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    this.setData({
      chartSelection: {
        date: dayjs(target.date).format('YYYY-MM-DD'),
        nav: Number(target.nav).toFixed(4)
      }
    });
  },

  onChartTouchEnd() {
    if (this.chartCtx) {
      const { ctx, data, width, height } = this.chartCtx;
      this.drawChartFrame(ctx, data, width, height);
    }
    this.setData({ chartSelection: null });
  },

  onRangeChange(e) {
    const range = e.currentTarget.dataset.range;
    if (range === this.data.activeRange) return;
    this.setData({ activeRange: range });
    this.updateChartData(range);
  },

  openTradeSheet() { this.setData({ showTradeSheet: true }); },
  closeTradeSheet() { this.setData({ showTradeSheet: false }); }
});