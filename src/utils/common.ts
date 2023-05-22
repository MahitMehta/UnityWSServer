export function intervalTimer(callback:Function, interval = 500) {
    let counter = 1;
    let timeoutId: number;
    const startTime = Date.now();
  
    function main() {
      const nowTime = Date.now();
      const nextTime = startTime + counter * interval;
      timeoutId = setTimeout(main, interval - (nowTime - nextTime)) as unknown as number;
      counter += 1;
      callback();
    }
  
    timeoutId = setTimeout(main, interval) as unknown as number;
  
    return () => {
      clearTimeout(timeoutId);
    };
  }