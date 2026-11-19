/**
 * 后台 Service Worker：拉取并缓存汇率。
 * 汇率以 USD 为基准存储，键为货币代码，值表示 1 USD 可兑换的数量。
 */
importScripts('currencies.js');

const RATE_CACHE_KEY = 'xrRateCache';
const API_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;

/** 离线兜底汇率（仅当在线接口不可用且无缓存时使用，仅供参考） */
const FALLBACK_RATES = Object.freeze({
  USD: 1,
  CNY: 7.1,
  EUR: 0.92,
  JPY: 155,
  GBP: 0.79,
  HKD: 7.8,
  TWD: 32,
  KRW: 1380,
  SGD: 1.34,
  AUD: 1.5,
  CAD: 1.37,
  NZD: 1.65,
  CHF: 0.88,
  SEK: 10.5,
  NOK: 10.7,
  DKK: 6.9,
  RUB: 92,
  INR: 84,
  BRL: 5.2,
  MXN: 18,
  THB: 35,
  VND: 25400,
  IDR: 16000,
  MYR: 4.5,
  PHP: 58,
  TRY: 34,
  PLN: 4,
  CZK: 23.5,
  HUF: 360,
  ILS: 3.7,
  AED: 3.67,
  SAR: 3.75,
  ZAR: 18.5,
  UAH: 41,
  NGN: 1600,
  EGP: 48,
  PKR: 278,
  BDT: 120,
  LKR: 300,
  KWD: 0.31,
  QAR: 3.64
});

/** 避免并发重复请求 */
let pendingFetch = null;

chrome.runtime.onInstalled.addListener(() => {
  getRates(false).catch((error) => {
    console.warn('[汇率转换器] 安装后预取汇率失败', error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  getRates(false).catch((error) => {
    console.warn('[汇率转换器] 启动后预取汇率失败', error);
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'XR_GET_RATES') return undefined;

  getRates(Boolean(message.force))
    .then((data) => {
      sendResponse({ ok: true, ...data });
    })
    .catch((error) => {
      console.error('[汇率转换器] 获取汇率失败', error);
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });
  return true;
});

/**
 * 获取汇率：优先使用有效缓存，其次在线获取，最后回退缓存或离线数据。
 * @param {boolean} force 是否强制跳过缓存
 */
async function getRates(force) {
  const cached = await readCache();
  if (!force && cached && isFresh(cached)) {
    return cached;
  }

  if (pendingFetch) return pendingFetch;

  pendingFetch = (async () => {
    try {
      const fresh = await fetchRates();
      await writeCache(fresh);
      return fresh;
    } catch (error) {
      console.warn('[汇率转换器] 在线汇率不可用，尝试回退', error);
      if (cached && isValidRates(cached.rates)) {
        return { ...cached, stale: true };
      }
      const fallback = {
        base: 'USD',
        rates: { ...FALLBACK_RATES },
        updatedAt: 0,
        source: 'fallback',
        stale: true
      };
      await writeCache(fallback);
      return fallback;
    } finally {
      pendingFetch = null;
    }
  })();

  return pendingFetch;
}

async function fetchRates() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(API_URL, {
      cache: 'no-store',
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!data || data.result !== 'success' || !isValidRates(data.rates)) {
      throw new Error('汇率接口返回数据无效');
    }
    const rates = normalizeRates(data.rates);
    if (!rates.USD) rates.USD = 1;
    return {
      base: 'USD',
      rates,
      updatedAt: Date.now(),
      source: 'online',
      stale: false
    };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeRates(raw) {
  const result = {};
  for (const [code, value] of Object.entries(raw)) {
    const rate = Number(value);
    if (Number.isFinite(rate) && rate > 0) {
      result[code] = rate;
    }
  }
  return result;
}

function isValidRates(rates) {
  return Boolean(rates) && typeof rates === 'object' && Number.isFinite(Number(rates.USD)) && Object.keys(rates).length > 5;
}

function isFresh(cache) {
  return Boolean(cache) &&
    isValidRates(cache.rates) &&
    Number(cache.updatedAt) > 0 &&
    Date.now() - Number(cache.updatedAt) < CACHE_TTL_MS;
}

function readCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get([RATE_CACHE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('[汇率转换器] 读取汇率缓存失败', chrome.runtime.lastError);
        resolve(null);
        return;
      }
      resolve(result ? result[RATE_CACHE_KEY] : null);
    });
  });
}

function writeCache(cache) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [RATE_CACHE_KEY]: cache }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[汇率转换器] 写入汇率缓存失败', chrome.runtime.lastError);
      }
      resolve();
    });
  });
}
