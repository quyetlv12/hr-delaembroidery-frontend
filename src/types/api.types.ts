export type ApiMeta = {
  page?: number;
  limit?: number;
  total?: number;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
  meta?: ApiMeta;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type SelectOption = {
  label: string;
  value: string;
};
