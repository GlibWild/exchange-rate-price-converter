/**
 * parser.js 单元测试（Node 原生断言，无第三方依赖）。
 * 运行：node tests/parser.test.js
 */
'use strict';

const assert = require('node:assert');
require('../currencies.js');
require('../parser.js');

const { detect, parseAmount } = globalThis.XRDetector;

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

function first(text, hints) {
  const items = detect(text, hints);
  assert.strictEqual(items.length, 1, `应识别出 1 个价格，实际 ${items.length}：${JSON.stringify(items)}`);
  return items[0];
}

const EN = { lang: 'en', host: 'example.com' };
const ZH = { lang: 'zh-CN', host: 'example.cn' };
const JA = { lang: 'ja', host: 'example.jp' };
const DE = { lang: 'de', host: 'example.de' };

test('美元符号价格', () => {
  const item = first('Only $12.99 today', EN);
  assert.strictEqual(item.currency, 'USD');
  assert.strictEqual(item.amount, 12.99);
  assert.strictEqual(item.raw, '$12.99');
});

test('US$ 前缀与大数字', () => {
  const item = first('US$1,299.00', EN);
  assert.strictEqual(item.currency, 'USD');
  assert.strictEqual(item.amount, 1299);
});

test('欧元区逗号小数', () => {
  const item = first('Preis: €1.234,56', DE);
  assert.strictEqual(item.currency, 'EUR');
  assert.strictEqual(item.amount, 1234.56);
});

test('后缀货币代码', () => {
  const item = first('Total 1,234.56 USD', EN);
  assert.strictEqual(item.currency, 'USD');
  assert.strictEqual(item.amount, 1234.56);
});

test('港币符号', () => {
  const item = first('HK$99', EN);
  assert.strictEqual(item.currency, 'HKD');
  assert.strictEqual(item.amount, 99);
});

test('¥ 按语言区分人民币与日元', () => {
  assert.strictEqual(first('¥1,299', ZH).currency, 'CNY');
  assert.strictEqual(first('¥1,299', JA).currency, 'JPY');
});

test('中文万元数量级', () => {
  const item = first('售价 12万元', ZH);
  assert.strictEqual(item.currency, 'CNY');
  assert.strictEqual(item.amount, 120000);
});

test('万美元数量级', () => {
  const item = first('价值 1.2万美元', ZH);
  assert.strictEqual(item.currency, 'USD');
  assert.strictEqual(item.amount, 12000);
});

test('中文货币名称后缀', () => {
  assert.strictEqual(first('100日元', ZH).currency, 'JPY');
  assert.strictEqual(first('12欧元', ZH).currency, 'EUR');
  assert.strictEqual(first('88元', ZH).amount, 88);
});

test('印尼盾点千分位', () => {
  const item = first('Rp 150.000', { lang: 'id', host: 'example.co.id' });
  assert.strictEqual(item.currency, 'IDR');
  assert.strictEqual(item.amount, 150000);
  // 页面语言不是印尼语时，仍按印尼盾习惯解析
  assert.strictEqual(first('Rp 150.000', ZH).amount, 150000);
});

test('瑞典克朗后缀', () => {
  const item = first('199,00 kr', { lang: 'sv', host: 'example.se' });
  assert.strictEqual(item.currency, 'SEK');
  assert.strictEqual(item.amount, 199);
});

test('全角人民币符号', () => {
  const item = first('￥89.00', ZH);
  assert.strictEqual(item.currency, 'CNY');
  assert.strictEqual(item.amount, 89);
});

test('空格与中文单位', () => {
  const item = first('售价：12.5 元', ZH);
  assert.strictEqual(item.currency, 'CNY');
  assert.strictEqual(item.amount, 12.5);
});

test('后缀代码无空格', () => {
  const item = first('价格 12USD', EN);
  assert.strictEqual(item.currency, 'USD');
  assert.strictEqual(item.amount, 12);
});

test('金额单位: million / k / 亿', () => {
  assert.strictEqual(first('$1.2 million', EN).amount, 1200000);
  assert.strictEqual(first('$50k', EN).amount, 50000);
  assert.strictEqual(first('1.5亿元', ZH).amount, 150000000);
});

test('多个价格互不重叠', () => {
  const items = detect('€10 - €20', DE);
  assert.strictEqual(items.length, 2);
  assert.ok(items[0].end <= items[1].start);
});

test('前后缀同时出现时只保留一个结果', () => {
  const items = detect('$12 USD', EN);
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].currency, 'USD');
  assert.strictEqual(items[0].amount, 12);
});

test('不应误判普通数字', () => {
  assert.deepStrictEqual(detect('2026-11-19 12:30 v1.2.3 100%', EN), []);
  assert.deepStrictEqual(detect('abc$12', EN), []);
  assert.deepStrictEqual(detect('12万用户', ZH), []);
});

test('千分位歧义处理', () => {
  assert.strictEqual(parseAmount('1,234', false), 1234);
  assert.strictEqual(parseAmount('1,234', true), 1.234);
  assert.strictEqual(parseAmount('1.234', true), 1234);
  assert.strictEqual(parseAmount('12,99', true), 12.99);
  assert.strictEqual(parseAmount('1 234,56', true), 1234.56);
});

test('非法金额返回 NaN', () => {
  assert.ok(Number.isNaN(parseAmount('', false)));
  assert.ok(Number.isNaN(parseAmount('abc', false)));
});

if (failures.length > 0) {
  console.error(`\n${failures.length} 个用例失败，${passed} 个通过。`);
  process.exit(1);
}

console.log(`\n全部 ${passed} 个用例通过。`);
