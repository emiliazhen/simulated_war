/**
 * 防抖 最后一次delay时后执行
 * @param fn 执行的业务函数
 * @param delay 延迟执行时间
 */
export const myDebounce = (fn: Function, delay: number = 400) => {
    let timer: any;
    return function (...args: any) {
        clearTimeout(timer);
        timer = setTimeout(function () {
            // @ts-ignore

            fn.apply(this, args);
        }, delay);
    };
};


/**
 * 节流 delay时间内执行一次
 * @param fn 执行的业务函数
 * @param delay 延迟执行时间
 */
export const myThrottle = (fn: Function, delay: number = 500) => {
    let flag = true
    return function (...args: any) {
        if (!flag) {
            return
        }
        flag = false
        setTimeout(() => {
            // @ts-ignore
            fn.apply(this, args)
            flag = true
        }, delay)
    }
}