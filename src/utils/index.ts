import { formatDate } from '@/utils/formatTime';

// 百分比格式化
export const percentFormat = (row: EmptyArrayType, column: number, cellValue: string) => {
  return cellValue ? `${cellValue}%` : '-';
};
// 列表日期时间格式化
export const dateFormatYMD = (row: EmptyArrayType, column: number, cellValue: string) => {
  if (!cellValue) return '-';
  return formatDate(new Date(cellValue), 'YYYY-mm-dd');
};
// 列表日期时间格式化
export const dateFormatYMDHMS = (row: EmptyArrayType, column: number, cellValue: string) => {
  if (!cellValue) return '-';
  return formatDate(new Date(cellValue), 'YYYY-mm-dd HH:MM:SS');
};
// 列表日期时间格式化
export const dateFormatHMS = (row: EmptyArrayType, column: number, cellValue: string) => {
  if (!cellValue) return '-';
  let time = 0;
  if (typeof row === 'number') time = row;
  if (typeof cellValue === 'number') time = cellValue;
  return formatDate(new Date(time * 1000), 'HH:MM:SS');
};

/**
 * 秒转时分秒
 * @param { value } 单位s
 */
export const second2time = (second: number | string | null) => {
  if (second === null || second === '') {
    return '-';
  }
  if (typeof second === 'string') {
    second = parseInt(second);
  }
  if (second === 0) {
    return '0秒';
  }
  second = Math.floor(second);
  const s = second % 60;
  const min = Math.floor(second / 60);
  const m = min % 60;
  const h = Math.floor(min / 60);
  const hStr = h ? `${h}小时` : '';
  const mStr = m ? `${m}分钟` : '';
  const sStr = s ? `${s}秒` : '';
  return `${hStr}${mStr}${sStr}`;
};
/**
 * 秒转时分秒
 * @param { value } 单位s
 */
export const second2videoTime = (second: number | string | null) => {
  if (second === null || second === '') {
    return '00:00:00';
  }
  if (typeof second === 'string') {
    second = parseInt(second);
  }
  second = Math.floor(second);
  const s = second % 60;
  const min = Math.floor(second / 60);
  const m = min % 60;
  const h = Math.floor(min / 60);
  const hStr = h.toString().padStart(2, '0');
  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');
  return `${hStr}:${mStr}:${sStr}`;
};
/**
 * 米转海里
 * @param { value } 单位px的值
 */
export const rice2NauticalMile = (value: number | string | null) => {
  if (value === null || value === '') {
    return '-';
  }
  if (typeof value === 'string') {
    value = parseFloat(value);
  }
  return Math.floor(value / 0.1852) / 10000;
};
/**
 * PX单位转Rem
 * @param { value } 单位px的值
 */
export const pxToRemValue = (value: number) => (value / 192).toFixed(3);

/**
 *  数字转换
 *  @param { value } 值
 *  @param { fixed } 精确位数
 * @param { minus }  是否允许负数
 **/
export const toFixed = (value: string | number, fixed = 0, minus = false) => {
  if (typeof value === 'number') {
    value = value.toString();
  } else if (!value) {
    return '';
  }
  let res: string | number = '';
  // .切到字符串，第一个值为整数部分，剩下的值一起为小数都分
  const [intPart, ...decimalList] = value.split('.');
  // 整数部分，parseInt 来过滤掉0开头
  let intValue: string | number = parseInt((intPart.match(/[0-9]/gim) || []).join(''));
  if (isNaN(intValue)) {
    intValue = '';
  }
  // 小数部分，取到精确位数并且直接裁剪不四舍五入
  let decimalValue = decimalList
    .map((v) => (v.match(/[0-9]/gim) || []).join(''))
    .join('')
    .substring(0, fixed);
  // 小数点后全为0 清除
  if (/^0+$/.test(decimalValue)) {
    decimalValue = '';
  }
  res = decimalValue.length ? `${intValue === '' ? 0 : intValue}.${decimalValue}` : intValue;
  // 允许负数时并且输入了-开头才显示负数
  if (minus && /^-/.test(value) && res) {
    res = `-${res}`;
  }
  return typeof res === 'number' ? res.toString() : res;
};
