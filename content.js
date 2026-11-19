/**
 * 内容脚本：扫描页面中的价格，并在原价后面追加换算结果。
 */
(function () {
  'use strict';

  const SETTINGS_KEY = 'xrSettings';
  const RATE_CACHE_KEY = 'xrRateCache';
  const RESCAN_KEY = 'xrRescanAt';

  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    targetCurrency: 'CNY',
    decimals: 2,
    skipSameCurrency: true
  });

  const SKIP_SELECTOR =
    'script,style,noscript,textarea,input,select,option,code,pre,kbd,samp,svg,canvas,iframe,.xr-conv,[contenteditable=""],[contenteditable="true"],[data-xr-skip]';

  const MAX_NODES_PER_PASS = 3000;
  const MAX_CONVERSIONS_PER_PASS = 600;
  const SCAN_DEBOUNCE_MS = 350;

  const CURRENCY_INFO = new Map(
    (globalThis.XR_CURRENCIES || []).map((item) => [item.code, item])
  );

  let settings = { ...DEFAULT_SETTINGS };
  /** @type {Record<string, number> | null} */
  let rates = null;
  let rateMeta = { updatedAt: 0, source: 'none' };
  let localeHints = { lang: 'en', host: '' };
  /** @type {MutationObserver | null} */
  let observer = null;
  let scanTimer = null;
  const pendingRoots = new Set();
  /** @type {WeakMap<Text, {text: string, badges: HTMLElement[]}>} */
  let nodeStates = new WeakMap();
  const skippedElements = new WeakSet();
  /** @type {HTMLElement[]} */
  let badges = [];
  let conversionsThisPass = 0;
  let running = false;
  let numberFormatter = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  init();

  function init() {
    if (!globalThis.XRDetector) {
      console.warn('[汇率转换器] 价格解析模块未加载');
      return;
    }
    localeHints = buildLocaleHints();
    chrome.storage.onChanged.addListener(handleStorageChange);
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    boot().catch((error) => {
      console.warn('[汇率转换器] 初始化失败', error);
    });
  }

  async function boot() {
    settings = normalizeSettings(await readSettings());
    numberFormatter = createFormatter(settings.decimals);

    const cache = await readRateCache();
    if (!applyRateCache(cache)) {
      const response = await requestRates();
      if (response && response.ok) {
        applyRateCache(response);
      }
    }

    if (!settings.enabled) return;
    if (!rates) {
      console.warn('[汇率转换器] 暂未获取到汇率，等待后台更新');
      startObserver();
      return;
    }

    running = true;
    startObserver();
    scanRoot(document.body);
  }

  function buildLocaleHints() {
    const lang = (document.documentElement.lang || navigator.language || 'en').toLowerCase();
    return {
      lang,
      host: (location.hostname || '').toLowerCase()
    };
  }

  function createFormatter(decimals) {
    const digits = Math.min(4, Math.max(0, Number(decimals) || 0));
    return new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function normalizeSettings(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const target = typeof source.targetCurrency === 'string' && CURRENCY_INFO.has(source.targetCurrency)
      ? source.targetCurrency
      : DEFAULT_SETTINGS.targetCurrency;
    const decimals = Number.isInteger(source.decimals)
      ? Math.min(4, Math.max(0, source.decimals))
      : DEFAULT_SETTINGS.decimals;
    return {
      enabled: source.enabled !== false,
      targetCurrency: target,
      decimals,
      skipSameCurrency: source.skipSameCurrency !== false
    };
  }

  function readSettings() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get({ [SETTINGS_KEY]: DEFAULT_SETTINGS }, (result) => {
          if (chrome.runtime.lastError) {
            resolve(DEFAULT_SETTINGS);
            return;
          }
          resolve(result ? result[SETTINGS_KEY] : DEFAULT_SETTINGS);
        });
      } catch (error) {
        resolve(DEFAULT_SETTINGS);
      }
    });
  }

  function readRateCache() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([RATE_CACHE_KEY], (result) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          resolve(result ? result[RATE_CACHE_KEY] : null);
        });
      } catch (error) {
        resolve(null);
      }
    });
  }

  function requestRates() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'XR_GET_RATES', force: false }, (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          resolve(response || null);
        });
      } catch (error) {
        resolve(null);
      }
    });
  }

  function applyRateCache(cache) {
    if (!cache || typeof cache !== 'object' || !cache.rates || typeof cache.rates !== 'object') {
      return false;
    }
    const next = {};
    for (const [code, value] of Object.entries(cache.rates)) {
      const rate = Number(value);
      if (Number.isFinite(rate) && rate > 0) {
        next[code] = rate;
      }
    }
    if (Object.keys(next).length === 0) return false;
    rates = next;
    rateMeta = {
      updatedAt: Number(cache.updatedAt) || 0,
      source: typeof cache.source === 'string' ? cache.source : 'unknown'
    };
    return true;
  }

  function convertAmount(amount, from, to) {
    if (!rates || !Number.isFinite(amount) || amount <= 0) return null;
    const fromRate = Number(rates[from]);
    const toRate = Number(rates[to]);
    if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0 || toRate <= 0) {
      return null;
    }
    const value = (amount / fromRate) * toRate;
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function formatTargetMoney(value, code) {
    const info = CURRENCY_INFO.get(code);
    const symbol = info ? info.symbol : code;
    const separator = /^[A-Za-z]+$/.test(symbol) ? ' ' : '';
    const digits = settings.decimals;
    const smallestUnit = Math.pow(10, -digits);
    if (value > 0 && value < smallestUnit) {
      return `${symbol}${separator}<${smallestUnit.toFixed(digits)}`;
    }
    return `${symbol}${separator}${numberFormatter.format(value)}`;
  }

  function formatPlain(value, digits) {
    return new Intl.NumberFormat('zh-CN', {
      maximumFractionDigits: typeof digits === 'number' ? digits : 4
    }).format(value);
  }

  function buildBadge(item, value) {
    const badge = document.createElement('span');
    badge.className = 'xr-conv';
    badge.setAttribute('data-xr-skip', '');
    badge.setAttribute('translate', 'no');
    badge.textContent = `≈ ${formatTargetMoney(value, settings.targetCurrency)}`;

    const rate = value / item.amount;
    const rateText = new Intl.NumberFormat('zh-CN', { maximumSignificantDigits: 6 }).format(rate);
    const lines = [
      `原价：${formatPlain(item.amount)} ${item.currency}`,
      `换算：${formatPlain(value)} ${settings.targetCurrency}`,
      `汇率：1 ${item.currency} ≈ ${rateText} ${settings.targetCurrency}`
    ];
    if (rateMeta.source === 'fallback') {
      lines.push('离线兜底汇率，仅供参考。');
    } else if (rateMeta.updatedAt > 0) {
      lines.push(`汇率更新：${new Date(rateMeta.updatedAt).toLocaleString('zh-CN', { hour12: false })}`);
    }
    badge.title = lines.join('\n');
    return badge;
  }

  function isSkipped(element) {
    if (skippedElements.has(element)) return true;
    const skipped = Boolean(element.closest(SKIP_SELECTOR));
    if (skipped) skippedElements.add(element);
    return skipped;
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(handleMutations);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
    pendingRoots.clear();
  }

  function handleMutations(mutations) {
    if (!running) return;
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        const target = mutation.target;
        if (target && target.nodeType === Node.TEXT_NODE && !isInsideBadge(target)) {
          pendingRoots.add(target);
        }
        continue;
      }
      for (const added of mutation.addedNodes) {
        if (!added) continue;
        if (added.nodeType === Node.TEXT_NODE) {
          if (!isInsideBadge(added)) pendingRoots.add(added);
          continue;
        }
        if (added.nodeType !== Node.ELEMENT_NODE) continue;
        if (added.classList && added.classList.contains('xr-conv')) continue;
        if (added.closest && added.closest('.xr-conv')) continue;
        pendingRoots.add(added);
      }
    }
    scheduleScan();
  }

  function isInsideBadge(node) {
    const parent = node.parentElement;
    return Boolean(parent && parent.closest('.xr-conv'));
  }

  function scheduleScan() {
    if (!running || scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      conversionsThisPass = 0;
      const roots = Array.from(pendingRoots);
      pendingRoots.clear();
      for (const root of roots) {
        if (!root) continue;
        if (root.nodeType === Node.TEXT_NODE) {
          if (root.isConnected) processTextNode(root);
          continue;
        }
        if (root.nodeType === Node.ELEMENT_NODE && root.isConnected) {
          scanRoot(root);
        }
      }
    }, SCAN_DEBOUNCE_MS);
  }

  function scanRoot(root) {
    if (!running || !root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      processTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const value = node.nodeValue;
        if (!value || value.length < 2 || !/\d/.test(value)) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || isSkipped(parent)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    let current = walker.nextNode();
    while (current) {
      nodes.push(current);
      if (nodes.length >= MAX_NODES_PER_PASS) break;
      current = walker.nextNode();
    }

    conversionsThisPass = 0;
    for (const node of nodes) {
      if (!node.isConnected) continue;
      processTextNode(node);
      if (conversionsThisPass >= MAX_CONVERSIONS_PER_PASS) break;
    }
  }

  function processTextNode(node) {
    if (!running || !node || node.nodeType !== Node.TEXT_NODE) return;
    if (conversionsThisPass >= MAX_CONVERSIONS_PER_PASS) return;

    const text = node.nodeValue;
    if (!text || text.length < 2) return;

    const state = nodeStates.get(node);
    if (state && state.text === text) return;

    const parent = node.parentElement;
    if (!parent || isSkipped(parent)) return;

    if (state) {
      for (const badge of state.badges) {
        badge.remove();
      }
    }

    const record = { text, badges: [] };
    nodeStates.set(node, record);

    const items = XRDetector.detect(text, localeHints);
    if (items.length === 0) return;

    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (conversionsThisPass >= MAX_CONVERSIONS_PER_PASS) break;
      const item = items[index];
      if (settings.skipSameCurrency && item.currency === settings.targetCurrency) continue;

      const value = convertAmount(item.amount, item.currency, settings.targetCurrency);
      if (value === null) continue;

      const badge = insertBadge(node, item, value);
      if (badge) {
        record.badges.push(badge);
        badges.push(badge);
        conversionsThisPass += 1;
      }
    }

    // 拆分文本节点后记录最新内容，避免重复处理
    record.text = node.nodeValue || '';
  }

  function insertBadge(node, item, value) {
    const parent = node.parentNode;
    if (!parent) return null;

    let badge;
    try {
      badge = buildBadge(item, value);
    } catch (error) {
      console.warn('[汇率转换器] 生成价格标注失败', error);
      return null;
    }

    try {
      const currentLength = (node.nodeValue || '').length;
      if (item.end >= currentLength) {
        parent.insertBefore(badge, node.nextSibling);
      } else {
        const tail = node.splitText(item.end);
        // 尾部文本属于本次已处理的内容，登记状态避免被 MutationObserver 重复换算
        nodeStates.set(tail, { text: tail.nodeValue || '', badges: [] });
        parent.insertBefore(badge, tail);
      }
    } catch (error) {
      return null;
    }
    return badge;
  }

  function clearBadges() {
    for (const badge of badges) {
      if (badge.isConnected) badge.remove();
    }
    badges = [];
  }

  function rerender() {
    stopObserver();
    clearBadges();
    nodeStates = new WeakMap();

    if (!settings.enabled || !rates) {
      running = false;
      return;
    }

    running = true;
    startObserver();
    scanRoot(document.body);
  }

  function handleStorageChange(changes, areaName) {
    if (areaName === 'sync' && changes[SETTINGS_KEY]) {
      const next = normalizeSettings(changes[SETTINGS_KEY].newValue);
      const changed =
        next.enabled !== settings.enabled ||
        next.targetCurrency !== settings.targetCurrency ||
        next.decimals !== settings.decimals ||
        next.skipSameCurrency !== settings.skipSameCurrency;
      settings = next;
      if (!changed) return;
      numberFormatter = createFormatter(settings.decimals);
      rerender();
      return;
    }

    if (areaName !== 'local') return;

    if (changes[RATE_CACHE_KEY]) {
      if (applyRateCache(changes[RATE_CACHE_KEY].newValue)) {
        numberFormatter = createFormatter(settings.decimals);
        rerender();
      }
    }

    if (changes[RESCAN_KEY] && settings.enabled) {
      rerender();
    }
  }

  function handleRuntimeMessage(message, _sender, sendResponse) {
    if (window.top !== window.self) return undefined;
    if (!message || message.type !== 'XR_STATUS') return undefined;

    sendResponse({
      ok: true,
      enabled: settings.enabled,
      running,
      count: badges.filter((badge) => badge.isConnected).length,
      targetCurrency: settings.targetCurrency,
      ratesSource: rateMeta.source,
      ratesUpdatedAt: rateMeta.updatedAt
    });
    return undefined;
  }
})();
