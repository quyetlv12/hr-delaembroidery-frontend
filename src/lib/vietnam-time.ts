export const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function getVietnamDateParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? value.getFullYear()),
    month: Number(parts.find((part) => part.type === "month")?.value ?? value.getMonth() + 1),
    day: Number(parts.find((part) => part.type === "day")?.value ?? value.getDate()),
  };
}

export function getVietnamCurrentPeriod(value = new Date()) {
  const { year, month } = getVietnamDateParts(value);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function toVietnamDateString(value = new Date()) {
  const { year, month, day } = getVietnamDateParts(value);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
