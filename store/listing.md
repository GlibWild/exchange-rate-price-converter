# Edge 加载项商店发布资料

本文件汇总提交到 Microsoft Edge 加载项商店（Partner Center）所需的文案与素材。

## 基本信息

| 项目 | 内容 |
| --- | --- |
| 扩展名称 | 汇率价格转换器 |
| 版本 | 1.0.0 |
| 建议分类 | 购物（Shopping）；备选：生产力（Productivity） |
| 支持语言 | 中文（简体）、English |
| 安装包 | `dist/exchange-rate-price-converter-1.0.0.zip` |
| 项目主页 | https://github.com/GlibWild/exchange-rate-price-converter |
| 支持链接 | https://github.com/GlibWild/exchange-rate-price-converter/issues |
| 隐私政策 | https://github.com/GlibWild/exchange-rate-price-converter/blob/main/PRIVACY.md |
| 是否需要登录 | 否 |

## 简短描述（与 manifest 一致）

自动识别网页中的价格与货币单位，并在原价后用所选目标货币显示换算结果。

## 详细描述（中文）

汇率价格转换器会在你浏览商品、机票、酒店等比价页面时，自动识别页面中的价格与货币单位，并在原价后面用你选择的目标货币显示换算结果，帮助你快速判断真实花费。

主要功能：

- 自动识别常见价格写法：$12.99、US$1,299、1,234.56 USD、€1.234,56、￥89、12.5 元、12万元、100円、Rp 150.000 等。
- 支持货币符号、ISO 货币代码和中文货币名称，覆盖人民币、美元、欧元、日元、英镑、港币、新台币、韩元、新加坡元、澳元、加元等 40 多种货币。
- 在扩展弹窗中通过下拉框选择目标货币，设置立即生效，已打开的页面会自动重新换算。
- 汇率每 6 小时自动更新；在线接口不可用时使用本地兜底汇率，并明确标注。
- 动态加载的内容（无限滚动、单页应用）会自动补扫，也可以手动点击「重新扫描」。
- 跳过代码块、输入框等区域，不会修改页面原有价格，不会自动下单或填写表单。

使用方式：

1. 安装扩展后打开任意带有价格的网页。
2. 点击工具栏中的扩展图标，在「换算为」中选择目标货币。
3. 页面中的价格后方会显示绿色换算结果，鼠标悬停可查看原价、换算金额与当前汇率。

隐私说明：

本扩展不收集、不上传任何浏览记录或页面内容；价格识别与换算全部在本地完成。唯一的网络请求用于获取公开汇率数据（open.er-api.com）。详见隐私政策链接。

## English description

Currency Price Converter detects prices and currency units on web pages and appends a conversion in your chosen target currency, so you can understand the real cost at a glance.

Highlights:

- Recognizes common formats such as $12.99, US$1,299, 1,234.56 USD, €1.234,56, ￥89, 12.5 CNY, 12万 CNY, 100 JPY, and Rp 150.000.
- Supports currency symbols, ISO codes, and Chinese currency names across 40+ currencies.
- Choose the target currency from the popup; changes apply immediately to open pages.
- Exchange rates refresh every 6 hours, with a clearly labeled offline fallback when the API is unavailable.
- Automatically handles dynamically loaded content and offers a manual rescan action.
- Skips code blocks and input fields, never modifies the original price, and never fills forms or places orders.

Privacy: the extension does not collect or upload browsing history or page content. All price detection and conversion happen locally. The only network request retrieves public exchange rates from open.er-api.com.

## 搜索关键词

汇率，货币转换，价格换算，汇率换算，跨境购物，海淘，currency converter，exchange rate，price converter，currency price

## 图片素材

| 文件 | 尺寸 | 用途 |
| --- | --- | --- |
| `store/logo-300.png` | 300 × 300 | 商店图标（必需） |
| `store/screenshot-1280x800.png` | 1280 × 800 | 商店截图（至少 1 张） |
| `store/promo-440x280.png` | 440 × 280 | 促销图（可选） |
| `store/screenshot-source.html` | — | 商店截图源文件，可用浏览器重新生成截图 |

## 审核备注（Submission notes）

- 无需登录、无需账号，也不包含应用内购买。
- 测试步骤：安装扩展 → 打开任意含价格的网页（可使用项目内 `demo/index.html`，或打开 https://books.toscrape.com）→ 点击工具栏扩展图标 → 在「换算为」中选择人民币 → 页面价格后方应出现绿色换算标注。
- 网络请求仅访问 `https://open.er-api.com/v6/latest/USD` 获取公开汇率，不携带页面内容或用户标识。
- 全部脚本均打包在安装包内，不加载远程代码。
- 权限说明：`storage` 用于保存设置与汇率缓存；`activeTab` 用于在弹窗中读取当前页面的标注数量；内容脚本用于识别并展示价格换算。

## 提交步骤（Partner Center）

Microsoft Edge 加载项商店目前不支持通过公开 API 自动提交，需要登录 Partner Center 手工上传：

1. 打开 https://partner.microsoft.com/dashboard/microsoftedge/overview 并使用 Microsoft 账号登录。
2. 首次使用需完成开发者注册（个人开发者注册免费）。
3. 选择「创建新扩展」，上传 `dist/exchange-rate-price-converter-1.0.0.zip`。
4. 填写商店列表：使用本文件中的名称、描述、分类、语言、隐私政策与支持链接。
5. 上传 `store/logo-300.png`、`store/screenshot-1280x800.png`，可选上传 `store/promo-440x280.png`。
6. 在审核备注中填写上面的测试步骤，提交认证。
7. 认证通常需要 1–7 个工作日。通过后可在 Partner Center 获取公开商店链接。

## 发布前检查清单

- [x] `manifest.json` 版本号为 `1.0.0`，名称与描述完整
- [x] 安装包根目录包含 `manifest.json`，zip 内路径使用 `/`
- [x] 图标 16/32/48/128 均已打包
- [x] 无远程代码、无广告与追踪组件
- [x] 隐私政策已提供公开链接
- [x] 商店截图、图标、促销图已准备
- [x] 单元测试通过（`node tests/parser.test.js`）
