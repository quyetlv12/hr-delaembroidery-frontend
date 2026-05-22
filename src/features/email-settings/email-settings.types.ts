export type EmailSettingsSource = "database" | "env" | "none";

export type EmailSettings = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  mailFrom: string;
  hasPassword: boolean;
  passwordPreview: string;
  source: EmailSettingsSource;
  isConfigured: boolean;
  updatedAt: string | null;
  updatedByLoginCode: string | null;
};

export type UpdateEmailSettingsInput = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass?: string;
  mailFrom: string;
};

export type EmailTestInput = {
  email: string;
};

export type EmailTestResult = {
  email: string;
  messageId?: string;
  sentAt: string;
};
