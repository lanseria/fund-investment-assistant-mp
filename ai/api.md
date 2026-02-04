### 第二部分：核心接口文档 (API Blueprint)

基于你提供的后端 `server/routes/api` 逻辑，我为你整理了小程序端需要的核心接口清单。

#### 1. 认证模块 (Auth)
- **POST `/api/auth/login`**
  - 入参：`{ username, password }`
  - 返回：`{ user: UserPayload }` (同时后端会下发 HttpOnly Cookie)
  - *小程序注意：小程序不支持 HttpOnly Cookie 自动管理，需手动从 Header 提取 `Set-Cookie` 或依赖后端返回 Token 存储在 Storage。*
- **GET `/api/auth/me`**
  - 返回：当前登录用户的资金、角色、AI 配置。

#### 2. 持仓管理 (Holdings)
- **GET `/api/fund/holdings`**
  - 返回：`{ holdings: [], summary: {} }` (核心：持仓列表、总资产、盈亏统计)。
- **POST `/api/fund/holdings`** (添加基金)
  - 入参：`{ code, fundType, shares?, costPrice? }`
- **POST `/api/fund/holdings/[code]/clear-position`** (清仓转关注)

#### 3. 交易模块 (Transactions)
- **POST `/api/fund/transactions`** (买入/卖出申请)
  - 入参：`{ fundCode, type: 'buy'|'sell', amount?, shares?, date }`
- **POST `/api/fund/convert`** (基金转换)
  - 入参：`{ fromCode, toCode, shares, date }`
- **GET `/api/transactions/daily`** (每日操作流)
  - 入参：`{ date }`

#### 4. 市场与情报 (Market & News)
- **GET `/api/news/[date]`**
  - 返回：当日原始报告、AI 深度分析、结构化精选新闻。
- **GET `/api/charts/rsi/[code]`** (RSI 策略数据)
- **GET `/api/fund/holdings/[code]/history`** (K 线与均线数据)

---

### 第三部分：分步引导开发路线图

你可以按照以下步骤询问 AI：

#### 第一步：基础架构与网络层封装
*   **任务**：配置 `axios-miniprogram` 拦截器，处理全局 `Loading` 和 `Token/Cookie` 注入。
*   **提问建议**：*“请根据我的依赖，帮我封装一个 `request.js`。要求：支持 BaseURL 配置，能自动拦截 401 错误并跳转登录页，且在请求发起时显示 Vant 的 Toast 加载中状态。”*

再完成登录功能
然后完成设计 tabbar、底部导航栏的规划以及首页的规划

#### 第二步：全局状态管理 (类似 Pinia 的实现)
*   **任务**：在小程序 `app.js` 中管理用户信息和全局持仓数据。
*   **提问建议**：*“Web 项目中使用了 Pinia 的 `useHoldingStore`，在微信小程序中我该如何建立一个全局可访问的 store 来同步持仓数据？请给出 `app.js` 的定义和页面调用的示例。”*

#### 第三步：首页：持仓列表与资产概览
*   **任务**：搬运 `PortfolioSummaryCard.vue` 和 `HoldingList.vue`。
*   **样式控制**：使用 UnoCSS 还原 Web 端的原子类样式。
*   **提问建议**：*“我想实现首页资产概览卡片。请使用 Vant 的布局组件和 UnoCSS 编写 WXML 和 JS。需要展示：总资产、昨日收益（红绿颜色判断）、总收益率。”*

#### 第四步：详情页：图表集成 (难点)
*   **任务**：在小程序中引入 `echarts-for-weixin` 还原 `FundChart.vue`。
*   **提问建议**：*“如何搬运基金历史净值图表？请展示如何在原生页面中初始化 ECharts，并绘制带有 MA5/MA20 均线的折线图，同时适配深色模式。”*

#### 第五步：交易表单：金融精度与 FIFO 逻辑
*   **任务**：搬运 `TradeForm.vue`。
*   **计算逻辑**：使用 `big.js` 处理买入金额和份额的换算。
*   **提问建议**：*“我要做一个买入/卖出表单。请帮我实现：点击 Vant 的 Button 弹出 Popup，输入金额时实时计算预估份额，并使用 big.js 保证不丢失精度。同时，如何还原 Web 端提到的‘不足7天卖出惩罚’的逻辑提示？”*

#### 第六步：市场情报：Markdown 渲染与多标签切换
*   **任务**：搬运 `news.vue`。
*   **提问建议**：*“市场情报页面有‘AI精选’和‘原始报告’两个 Tab。原始报告是 Markdown 格式，在微信小程序中我该如何高效渲染这些文字内容？”*
