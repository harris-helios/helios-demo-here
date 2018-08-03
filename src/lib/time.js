// Round the specified time down to the nearest interval
//
function round(time, intervalMinutes, bufferMinutes = 0) {
  const date = time === 'now' ? new Date() : new Date(time);
  const interval = intervalMinutes * 60 * 1000;
  const buffered = date.getTime() - (bufferMinutes * 60 * 1000);
  const rounded = new Date(Math.floor(buffered / interval) * interval).toISOString();
  return rounded;
}

export {
  round
};
