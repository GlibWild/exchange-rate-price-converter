/**
 * 货币定义（内容脚本、弹窗、后台共用）。
 * code   ISO 4217 货币代码
 * name   中文名称
 * symbol 常用符号（用于页面标注与下拉框展示）
 */
(function (global) {
  'use strict';

  const CURRENCIES = [
    { code: 'CNY', name: '人民币', symbol: '¥' },
    { code: 'USD', name: '美元', symbol: '$' },
    { code: 'EUR', name: '欧元', symbol: '€' },
    { code: 'JPY', name: '日元', symbol: '¥' },
    { code: 'GBP', name: '英镑', symbol: '£' },
    { code: 'HKD', name: '港币', symbol: 'HK$' },
    { code: 'TWD', name: '新台币', symbol: 'NT$' },
    { code: 'KRW', name: '韩元', symbol: '₩' },
    { code: 'SGD', name: '新加坡元', symbol: 'S$' },
    { code: 'AUD', name: '澳元', symbol: 'A$' },
    { code: 'CAD', name: '加元', symbol: 'C$' },
    { code: 'NZD', name: '新西兰元', symbol: 'NZ$' },
    { code: 'CHF', name: '瑞士法郎', symbol: 'CHF' },
    { code: 'SEK', name: '瑞典克朗', symbol: 'kr' },
    { code: 'NOK', name: '挪威克朗', symbol: 'kr' },
    { code: 'DKK', name: '丹麦克朗', symbol: 'kr' },
    { code: 'RUB', name: '俄罗斯卢布', symbol: '₽' },
    { code: 'INR', name: '印度卢比', symbol: '₹' },
    { code: 'BRL', name: '巴西雷亚尔', symbol: 'R$' },
    { code: 'MXN', name: '墨西哥比索', symbol: 'MX$' },
    { code: 'THB', name: '泰铢', symbol: '฿' },
    { code: 'VND', name: '越南盾', symbol: '₫' },
    { code: 'IDR', name: '印尼盾', symbol: 'Rp' },
    { code: 'MYR', name: '马来西亚林吉特', symbol: 'RM' },
    { code: 'PHP', name: '菲律宾比索', symbol: '₱' },
    { code: 'TRY', name: '土耳其里拉', symbol: '₺' },
    { code: 'PLN', name: '波兰兹罗提', symbol: 'zł' },
    { code: 'CZK', name: '捷克克朗', symbol: 'Kč' },
    { code: 'HUF', name: '匈牙利福林', symbol: 'Ft' },
    { code: 'ILS', name: '以色列新谢克尔', symbol: '₪' },
    { code: 'AED', name: '阿联酋迪拉姆', symbol: 'AED' },
    { code: 'SAR', name: '沙特里亚尔', symbol: 'SAR' },
    { code: 'ZAR', name: '南非兰特', symbol: 'R' },
    { code: 'UAH', name: '乌克兰格里夫纳', symbol: '₴' },
    { code: 'NGN', name: '尼日利亚奈拉', symbol: '₦' },
    { code: 'EGP', name: '埃及镑', symbol: 'E£' },
    { code: 'PKR', name: '巴基斯坦卢比', symbol: '₨' },
    { code: 'BDT', name: '孟加拉塔卡', symbol: '৳' },
    { code: 'LKR', name: '斯里兰卡卢比', symbol: 'Rs' },
    { code: 'KWD', name: '科威特第纳尔', symbol: 'KD' },
    { code: 'QAR', name: '卡塔尔里亚尔', symbol: 'QR' }
  ];

  global.XR_CURRENCIES = CURRENCIES;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CURRENCIES };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
