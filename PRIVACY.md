# 隐私政策（Privacy Policy）

本隐私政策适用于浏览器扩展「汇率价格转换器」（以下简称“本扩展”）。

生效日期：2026 年 11 月 19 日

## 1. 我们不收集任何个人数据

本扩展不会收集、上传、出售或共享任何个人信息，包括但不限于：

- 浏览记录、访问的网址、页面内容；
- 账号、密码、支付信息；
- 设备标识、IP 地址、位置信息；
- 使用行为统计或分析数据。

## 2. 页面内容仅在本地处理

本扩展在浏览器本地读取页面文本以识别价格与货币单位，并将换算结果插入当前页面显示。
这一过程完全在您的设备上完成，页面内容不会被发送到任何服务器。

## 3. 网络请求

本扩展仅在需要更新汇率时请求公开汇率接口：

- 接口地址：`https://open.er-api.com/v6/latest/USD`
- 请求内容：仅包含获取最新汇率所需的 HTTP 请求，不包含页面内容或任何用户标识。
- 用途：获取以 USD 为基准的公开汇率数据。

该接口由其运营方按照其自身隐私政策处理请求，本扩展无法控制第三方服务。

## 4. 本地存储

本扩展使用浏览器提供的存储能力保存以下数据：

- 用户设置（目标货币、小数位、启用状态等），保存在 `chrome.storage.sync`；
- 汇率缓存（含更新时间），保存在 `chrome.storage.local`。

上述数据仅保存在您的浏览器中。若浏览器启用了同步功能，设置可能通过浏览器厂商的账号同步服务在您的设备间同步，这一过程由浏览器厂商负责。

## 5. 权限说明

- `storage`：保存设置与汇率缓存；
- `activeTab`：在您打开扩展弹窗时读取当前标签页的标注数量；
- 主机权限 `https://open.er-api.com/*`：获取公开汇率数据；
- 内容脚本在网页中运行：识别并展示价格换算结果。

本扩展不会修改页面原有价格，不会自动填写表单、下单或执行任何交易操作。

## 6. 第三方服务与远程代码

本扩展不加载或执行任何远程代码，不包含广告、统计或跟踪组件，也不集成任何第三方分析服务。

## 7. 儿童隐私

本扩展不面向儿童收集任何信息，也不会有意收集儿童的个人数据。

## 8. 政策更新

如本隐私政策发生变更，我们会在本页面更新内容并修改生效日期。继续使用本扩展即表示您接受更新后的政策。

## 9. 联系方式

如有疑问或建议，请通过以下方式联系：

- GitHub Issues：https://github.com/GlibWild/exchange-rate-price-converter/issues

---

# Privacy Policy (English Summary)

This extension does not collect, transmit, sell, or share any personal data. Page content is processed locally in the browser to detect prices and display conversions. The only network request is to `https://open.er-api.com/v6/latest/USD` to retrieve public exchange rates, and it contains no page content or user identifiers. Settings are stored with `chrome.storage.sync`, and rate data is cached with `chrome.storage.local`. No remote code, ads, analytics, or tracking are used.

Contact: https://github.com/GlibWild/exchange-rate-price-converter/issues
