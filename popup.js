/**
 * 弹窗逻辑：读写设置、展示汇率状态、触发刷新与重新扫描。
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

  const COMMON_CURRENCIES = ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'TWD', 'KRW', 'SGD', 'AUD', 'CAD', 'CHF'];

  const CURRENCIES = window.XR_CURRENCIES || [];
  const CURRENCY_MAP = new Map(CURRENCIES.map((item) => [item.code, item]));

  const elements = {
    enabled: document.getElementById('enabled'),
    target: document.getElementById('target'),
    decimals: document.getElementById('decimals'),
    skipSame: document.getElementById('skipSame'),
    rateLine: document.getElementById('rateLine'),
    rateDetail: document.getElementById('rateDetail'),
    refreshRates: document.getElementById('refreshRates'),
    rescan: document.getElementById('rescan'),
    pageStatus: document.getElementById('pageStatus'),
    toast: document.getElementById('toast')
  };

  let settings = { ...DEFAULT_SETTINGS };
  let toastTimer = null;
  let lastRates = null;

  init();

  async function init() {
    buildCurrencyOptions();
    settings = normalizeSettings(await loadSettings());
    applySettingsToForm(settings);
    const cache = await loadRateCache();
    renderRates(cache);
    bindEvents();
    watchStorage();
    refreshPageStatus();
  }

  function buildCurrencyOptions() {
    const commonGroup = document.createElement('optgroup');
    commonGroup.label = '常用货币';
    const otherGroup = document.createElement('optgroup');
    otherGroup.label = '其他货币';

    for (const code of COMMON_CURRENCIES) {
      const info = CURRENCY_MAP.get(code);
      if (info) commonGroup.appendChild(createOption(info));
    }

    CURRENCIES
      .filter((item) => !COMMON_CURRENCIES.includes(item.code))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
      .forEach((item) => otherGroup.appendChild(createOption(item)));

    elements.target.appendChild(commonGroup);
    if (otherGroup.children.length > 0) elements.target.appendChild(otherGroup);
  }

  function createOption(info) {
    const option = document.createElement('option');
    option.value = info.code;
    option.textContent = `${info.name}（${info.code}）`;
    return option;
  }

  function bindEvents() {
    elements.enabled.addEventListener('change', () => {
      settings = readForm();
      persistSettings();
    });

    elements.target.addEventListener('change', () => {
      settings = readForm();
      persistSettings();
      renderRatesDetail(lastRates);
    });

    elements.decimals.addEventListener('change', () => {
      settings = readForm();
      persistSettings();
    });

    elements.skipSame.addEventListener('change', () => {
      settings = readForm();
      persistSettings();
    });

    elements.refreshRates.addEventListener('click', refreshRates);
    elements.rescan.addEventListener('click', rescanPage);
  }

  function readForm() {
    return normalizeSettings({
      enabled: elements.enabled.checked,
      targetCurrency: elements.target.value,
      decimals: Number(elements.decimals.value),
      skipSameCurrency: elements.skipSame.checked
    });
  }

  function applySettingsToForm(value) {
    elements.enabled.checked = value.enabled;
    elements.target.value = value.targetCurrency;
    elements.decimals.value = String(value.decimals);
    elements.skipSame.checked = value.skipSameCurrency;
  }

  function normalizeSettings(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const target = typeof source.targetCurrency === 'string' && CURRENCY_MAP.has(source.targetCurrency)
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

  function persistSettings() {
    try {
      chrome.storage.sync.set({ [SETTINGS_KEY]: settings }, () => {
        if (chrome.runtime.lastError) {
          showToast('保存失败，请重试');
          return;
        }
        showToast('设置已保存');
        refreshPageStatus();
      });
    } catch (error) {
      showToast('保存失败，请重试');
    }
  }

  function loadSettings() {
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

  function loadRateCache() {
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

  function renderRates(cache) {
    lastRates = cache;
    if (!cache || !cache.rates) {
      elements.rateLine.textContent = '尚未获取汇率，点击「刷新汇率」重试。';
      elements.rateDetail.textContent = '';
      elements.rateDetail.classList.remove('warn');
      return;
    }

    if (cache.source === 'fallback') {
      elements.rateLine.textContent = '当前为离线兜底汇率，仅供参考。';
      elements.rateDetail.textContent = '联网后点击「刷新汇率」可获取最新数据。';
      elements.rateDetail.classList.add('warn');
      return;
    }

    const time = cache.updatedAt
      ? new Date(cache.updatedAt).toLocaleString('zh-CN', { hour12: false })
      : '未知';
    elements.rateLine.textContent = `汇率已更新：${time}`;
    renderRatesDetail(cache);
  }

  function renderRatesDetail(cache) {
    if (!cache || !cache.rates) {
      elements.rateDetail.textContent = '';
      return;
    }
    const usdRate = Number(cache.rates.USD);
    const targetRate = Number(cache.rates[settings.targetCurrency]);
    if (!Number.isFinite(usdRate) || !Number.isFinite(targetRate) || targetRate <= 0) {
      elements.rateDetail.textContent = '';
      return;
    }
    const unit = targetRate / usdRate;
    const info = CURRENCY_MAP.get(settings.targetCurrency);
    const label = info ? `${info.name}（${info.code}）` : settings.targetCurrency;
    elements.rateDetail.textContent = `1 USD ≈ ${formatRate(unit)} ${label}`;
    if (cache.source === 'fallback' || cache.stale) {
      elements.rateDetail.classList.add('warn');
      if (cache.source === 'fallback') {
        elements.rateDetail.textContent += ' · 离线数据';
      }
    } else {
      elements.rateDetail.classList.remove('warn');
    }
  }

  function formatRate(value) {
    if (value >= 1000) return value.toFixed(2);
    if (value >= 1) return value.toFixed(4);
    return value.toPrecision(4);
  }

  async function refreshRates() {
    const button = elements.refreshRates;
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = '刷新中…';
    try {
      const response = await sendMessage({ type: 'XR_GET_RATES', force: true });
      if (response && response.ok) {
        renderRates(response);
        showToast(response.source === 'fallback' ? '在线汇率不可用，已回退离线数据' : '汇率已更新');
      } else {
        showToast('刷新失败，请检查网络后重试');
      }
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function rescanPage() {
    try {
      chrome.storage.local.set({ [RESCAN_KEY]: Date.now() }, () => {
        if (chrome.runtime.lastError) {
          showToast('操作失败，请重试');
          return;
        }
        showToast('已通知页面重新扫描');
        setTimeout(refreshPageStatus, 800);
      });
    } catch (error) {
      showToast('操作失败，请重试');
    }
  }

  function sendMessage(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
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

  function refreshPageStatus() {
    elements.pageStatus.classList.remove('off');
    if (!settings.enabled) {
      elements.pageStatus.textContent = '插件已停用。';
      elements.pageStatus.classList.add('off');
      return;
    }

    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
          elements.pageStatus.textContent = '';
          return;
        }
        const tab = tabs[0];
        if (!tab.id) {
          elements.pageStatus.textContent = '';
          return;
        }
        chrome.tabs.sendMessage(tab.id, { type: 'XR_STATUS' }, (response) => {
          if (chrome.runtime.lastError || !response || !response.ok) {
            elements.pageStatus.textContent = '当前页面不可用，请打开普通网页后刷新。';
            return;
          }
          const count = Number(response.count) || 0;
          elements.pageStatus.textContent = count > 0
            ? `当前页面已标注 ${count} 处价格。`
            : '当前页面暂未识别到价格。';
        });
      });
    } catch (error) {
      elements.pageStatus.textContent = '';
    }
  }

  function watchStorage() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes[RATE_CACHE_KEY]) {
        renderRates(changes[RATE_CACHE_KEY].newValue);
      }
    });
  }

  function showToast(text) {
    elements.toast.textContent = text;
    elements.toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 1800);
  }
})();
