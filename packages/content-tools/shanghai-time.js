export const SHANGHAI_TIME_ZONE = "Asia/Shanghai";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHANGHAI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/;

export function formatShanghaiDateTime(date) {
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`;
}

export function isShanghaiDateTime(value) {
  if (typeof value !== "string" || !pattern.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && formatShanghaiDateTime(date) === value;
}
