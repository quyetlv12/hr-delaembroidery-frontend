import type { DatePickerProps } from "react-datepicker";

type DatePickerPopperModifiers = NonNullable<DatePickerProps["popperModifiers"]>;
type DatePickerPopperProps = NonNullable<DatePickerProps["popperProps"]>;

const VIEWPORT_PADDING = 16;

const smartViewportShiftMiddleware: DatePickerPopperModifiers[number] = {
  name: "hrmSmartViewportShift",
  fn({ x, y, rects }) {
    if (typeof window === "undefined") {
      return { x, y };
    }

    return {
      x: clampToViewport(x, rects.floating.width, window.innerWidth),
      y: clampToViewport(y, rects.floating.height, window.innerHeight),
    };
  },
};

export const smartDatePickerPopperModifiers: DatePickerPopperModifiers = [
  smartViewportShiftMiddleware,
];

export const smartDatePickerPopperProps: DatePickerPopperProps = {
  strategy: "fixed",
};

function clampToViewport(position: number, floatingSize: number, viewportSize: number) {
  const min = VIEWPORT_PADDING;
  const max = viewportSize - floatingSize - VIEWPORT_PADDING;
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(position, min), max);
}
