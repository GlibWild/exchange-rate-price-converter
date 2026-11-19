/**
 * 价格识别与金额解析（纯函数，可在内容脚本与 Node 测试中复用）。
 * 对外暴露 globalThis.XRDetector = { detect, parseAmount, resolveCurrency }
 */
(function (global) {
  'use strict';

  const CURRENCIES = global.XR_CURRENCIES || [];
  const CODE_SET = new Set(CURRENCIES.map((item) => item.code));
  CODE_SET.add('RMB');

  /** 中文货币名称 → 货币代码 */
  const NAME_MAP = Object.freeze({
    '人民币': 'CNY',
    '美元': 'USD',
    '美金': 'USD',
    '欧元': 'EUR',
    '英镑': 'GBP',
    '日元': 'JPY',
    '日圆': 'JPY',
    '港币': 'HKD',
    '港元': 'HKD',
    '韩元': 'KRW',
    '韩币': 'KRW',
    '卢布': 'RUB',
    '泰铢': 'THB',
    '越南盾': 'VND',
    '印尼盾': 'IDR',
    '澳元': 'AUD',
    '澳大利亚元': 'AUD',
    '加元': 'CAD',
    '加拿大元': 'CAD',
    '新加坡元': 'SGD',
    '新台币': 'TWD',
    '台币': 'TWD',
    '瑞士法郎': 'CHF',
    '瑞典克朗': 'SEK',
    '挪威克朗': 'NOK',
    '丹麦克朗': 'DKK',
    '印度卢比': 'INR',
    '巴西雷亚尔': 'BRL',
    '墨西哥比索': 'MXN',
    '土耳其里拉': 'TRY',
    '波兰兹罗提': 'PLN',
    '俄罗斯卢布': 'RUB',
    '菲律宾比索': 'PHP',
    '马来西亚林吉特': 'MYR',
    '南非兰特': 'ZAR',
    '新谢克尔': 'ILS',
    '迪拉姆': 'AED',
    '里亚尔': 'SAR'
  });

  /** 货币符号 → 货币代码（歧义符号单独处理） */
  const SYMBOL_MAP = Object.freeze({
    'US$': 'USD',
    'HK$': 'HKD',
    'NT$': 'TWD',
    'CA$': 'CAD',
    'C$': 'CAD',
    'AU$': 'AUD',
    'A$': 'AUD',
    'NZ$': 'NZD',
    'MX$': 'MXN',
    'S$': 'SGD',
    'R$': 'BRL',
    'CN¥': 'CNY',
    'JP¥': 'JPY',
    '€': 'EUR',
    '£': 'GBP',
    '₩': 'KRW',
    '₹': 'INR',
    '₽': 'RUB',
    '₺': 'TRY',
    '₴': 'UAH',
    '฿': 'THB',
    '₫': 'VND',
    '₱': 'PHP',
    '₪': 'ILS',
    '₦': 'NGN',
    '₨': 'PKR',
    '৳': 'BDT',
    'RM': 'MYR',
    'Rp': 'IDR',
    'Rs': 'LKR',
    'zł': 'PLN',
    'Kč': 'CZK',
    'Ft': 'HUF',
    'E£': 'EGP',
    'KD': 'KWD',
    'QR': 'QAR'
  });

  /** 页面地区（顶级域名）对 "$" 的提示 */
  const DOLLAR_TLD_HINTS = [
    [/\.ca$/, 'CAD'],
    [/\.com\.au$|\.net\.au$|\.au$/, 'AUD'],
    [/(^|\.)nz$/, 'NZD'],
    [/(^|\.)sg$/, 'SGD'],
    [/(^|\.)hk$/, 'HKD'],
    [/(^|\.)tw$/, 'TWD'],
    [/(^|\.)mx$/, 'MXN']
  ];

  /** 符号优先级：长度长的放前面，避免 "$" 抢先匹配 "US$" */
  const SYMBOL_TOKENS = [
    'US$', 'HK$', 'NT$', 'CA$', 'AU$', 'NZ$', 'MX$', 'CN¥', 'JP¥',
    'S$', 'C$', 'A$', 'R$', 'RM', 'Rp', 'Rs', 'zł', 'Kč', 'Ft', 'E£', 'KD', 'QR',
    '$', '＄', '€', '£', '¥', '￥', '₩', '₹', '₽', '₺', '₴', '฿', '₫', '₱', '₪', '₦', '₨', '৳'
  ];

  const NAME_TOKENS = Object.keys(NAME_MAP);
  /** 仅出现在数字之后的货币标记 */
  const SUFFIX_ONLY_TOKENS = ['元', '円', '원', 'kr'];

  /** 数字形态：千分位、欧式、空格千分位、普通数字 */
  const NUM = [
    '\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,4})?',
    '\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,4})?',
    '\\d{1,3}(?:[\\s\\u00a0\\u202f]\\d{3})+(?:[.,]\\d{1,4})?',
    '\\d+(?:[.,]\\d{1,4})?'
  ].join('|');

  /** 数量级后缀：million / 万 / 亿 / k / M / B */
  const MULT = '(?:\\s?(?<word>million|billion|trillion|thousand)|(?<cnUnit>[万亿億])|(?<shortUnit>[kKMB]))?';

  function escapeRe(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function buildAlt(tokens) {
    return tokens
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(escapeRe)
      .join('|');
  }

  const CURRENCY_ALT = [buildAlt(SYMBOL_TOKENS), buildAlt(NAME_TOKENS), [...CODE_SET].join('|')].join('|');
  const SUFFIX_ALT = [buildAlt(SYMBOL_TOKENS), buildAlt(NAME_TOKENS), buildAlt(SUFFIX_ONLY_TOKENS), [...CODE_SET].join('|')].join('|');

  const RE_PREFIX = new RegExp(
    `(?<![0-9A-Za-z])(?<cur>${CURRENCY_ALT})[\\s\\u00a0\\u202f]{0,2}(?<num>${NUM})${MULT}(?![0-9]|[.,]\\d)`,
    'g'
  );

  const RE_SUFFIX = new RegExp(
    `(?<![0-9A-Za-z])(?<num>${NUM})${MULT}[\\s\\u00a0\\u202f]{0,2}(?<cur>${SUFFIX_ALT})(?![A-Za-z0-9])`,
    'g'
  );

  /** 使用逗号作为小数点的语言 */
  const EUROPEAN_LANGS = /^(de|fr|es|it|nl|pt|pl|ru|sv|da|nb|nn|no|fi|is|cs|hu|ro|bg|hr|sk|sl|uk|el|et|lv|lt|tr|id|vi|ca)/;

  /** 习惯使用「点千分位」的货币（印尼盾、越南盾等） */
  const DOT_THOUSANDS_CURRENCIES = new Set(['IDR', 'VND']);

  /**
   * 解析金额字符串。
   * @param {string} raw 原始数字文本
   * @param {boolean} europeanStyle 是否为「点千分位、逗号小数」格式
   * @returns {number} 解析后的数值，失败返回 NaN
   */
  function parseAmount(raw, europeanStyle) {
    if (typeof raw !== 'string' || raw.trim() === '') return NaN;
    let text = raw.replace(/[\s\u00a0\u202f]/g, '');
    if (text === '') return NaN;

    const hasComma = text.includes(',');
    const hasDot = text.includes('.');

    if (hasComma && hasDot) {
      // 两种分隔符同时出现：最后出现的那个是小数点
      if (text.lastIndexOf(',') > text.lastIndexOf('.')) {
        text = text.replace(/\./g, '').replace(/,/g, '.');
      } else {
        text = text.replace(/,/g, '');
      }
    } else if (hasComma) {
      const parts = text.split(',');
      const isThousands =
        parts.length > 2 ||
        (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3 && !europeanStyle);
      text = isThousands ? text.replace(/,/g, '') : text.replace(',', '.');
    } else if (hasDot) {
      const parts = text.split('.');
      const isThousands =
        parts.length > 2 ||
        (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3 && europeanStyle);
      text = isThousands ? text.replace(/\./g, '') : text;
    }

    if (!/^\d+(?:\.\d+)?$/.test(text)) return NaN;
    const value = Number(text);
    return Number.isFinite(value) ? value : NaN;
  }

  function dollarHint(hints) {
    const host = (hints && hints.host) || '';
    for (const [pattern, code] of DOLLAR_TLD_HINTS) {
      if (pattern.test(host)) return code;
    }
    return 'USD';
  }

  function yenHint(hints) {
    const lang = (hints && hints.lang) || '';
    const host = (hints && hints.host) || '';
    if (lang.startsWith('ja') || /\.jp$/.test(host)) return 'JPY';
    return 'CNY';
  }

  function kronorHint(hints) {
    const lang = (hints && hints.lang) || '';
    if (lang.startsWith('sv')) return 'SEK';
    if (lang.startsWith('nb') || lang.startsWith('nn') || lang.startsWith('no')) return 'NOK';
    if (lang.startsWith('da')) return 'DKK';
    if (lang.startsWith('is')) return 'ISK';
    return 'SEK';
  }

  /**
   * 将货币标记解析为货币代码，无法识别返回 null。
   * @param {string} token 货币符号、代码或中文名称
   * @param {{lang?: string, host?: string}} hints 页面语言与域名提示
   */
  function resolveCurrency(token, hints) {
    const text = (token || '').trim();
    if (!text) return null;
    const hint = hints || {};

    if (text === '元') {
      return ((hint.lang || '').startsWith('ja')) ? 'JPY' : 'CNY';
    }
    if (text === '円') return 'JPY';
    if (text === '원') return 'KRW';
    if (text === 'kr') return kronorHint(hint);

    if (NAME_MAP[text]) return NAME_MAP[text];

    const upper = text.toUpperCase();
    if (CODE_SET.has(upper)) return upper === 'RMB' ? 'CNY' : upper;

    if (text === '$' || text === '＄') return dollarHint(hint);
    if (text === '¥' || text === '￥') return yenHint(hint);
    if (SYMBOL_MAP[text]) return SYMBOL_MAP[text];

    return null;
  }

  function multiplierOf(groups) {
    if (groups.word) {
      switch (groups.word.toLowerCase()) {
        case 'thousand': return 1e3;
        case 'million': return 1e6;
        case 'billion': return 1e9;
        case 'trillion': return 1e12;
        default: return 1;
      }
    }
    if (groups.cnUnit === '万') return 1e4;
    if (groups.cnUnit === '亿' || groups.cnUnit === '億') return 1e8;
    if (groups.shortUnit === 'k' || groups.shortUnit === 'K') return 1e3;
    if (groups.shortUnit === 'M') return 1e6;
    if (groups.shortUnit === 'B') return 1e9;
    return 1;
  }

  function collect(regex, text, hints, europeanStyle, output) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!match[0]) {
        regex.lastIndex += 1;
        continue;
      }
      const currency = resolveCurrency(match.groups.cur, hints);
      if (!currency) continue;
      const useEuropean = europeanStyle || DOT_THOUSANDS_CURRENCIES.has(currency);
      const base = parseAmount(match.groups.num, useEuropean);
      if (!Number.isFinite(base)) continue;
      const amount = base * multiplierOf(match.groups);
      if (!Number.isFinite(amount) || amount <= 0) continue;

      output.push({
        start: match.index,
        end: match.index + match[0].length,
        amount,
        currency,
        raw: match[0]
      });
    }
  }

  /**
   * 识别文本中的所有价格。
   * @param {string} text 待识别文本
   * @param {{lang?: string, host?: string}} rawHints 页面语言与域名
   * @returns {Array<{start:number,end:number,amount:number,currency:string,raw:string}>}
   */
  function detect(text, rawHints) {
    if (typeof text !== 'string' || text.length === 0 || !/\d/.test(text)) return [];
    if (text.length > 4000) return [];

    const hints = rawHints || {};
    const lang = (hints.lang || '').toLowerCase();
    const europeanStyle = EUROPEAN_LANGS.test(lang);
    const candidates = [];

    collect(RE_PREFIX, text, hints, europeanStyle, candidates);
    collect(RE_SUFFIX, text, hints, europeanStyle, candidates);
    if (candidates.length === 0) return [];

    // 同一价格可能同时被前缀与后缀规则命中，优先保留覆盖范围更长的结果
    candidates.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
    const selected = [];
    for (const item of candidates) {
      const overlapped = selected.some((picked) => item.start < picked.end && item.end > picked.start);
      if (!overlapped) selected.push(item);
    }
    selected.sort((a, b) => a.start - b.start);
    return selected;
  }

  global.XRDetector = { detect, parseAmount, resolveCurrency };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.XRDetector;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
