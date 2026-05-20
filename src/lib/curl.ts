export type ParsedCurlRequest = {
  endpoint?: string;
  cookie?: string;
  payload?: string;
};

export function parseCurlRequest(command: string): ParsedCurlRequest {
  const endpoint = command.match(/https?:\/\/[^\s'"]+/)?.[0];
  const cookie = extractCookie(command);
  const payload = extractFlagValues(command, ["--data-raw", "--data", "--data-binary", "-d"]).at(-1);

  return {
    endpoint,
    cookie,
    payload,
  };
}

function extractCookie(command: string) {
  const cookieFlag = extractFlagValues(command, ["-b", "--cookie"]).at(-1);
  if (cookieFlag) {
    return cookieFlag;
  }

  const cookieHeader = extractFlagValues(command, ["-H", "--header"]).find((header) =>
    /^cookie\s*:/i.test(header),
  );
  return cookieHeader?.replace(/^cookie\s*:\s*/i, "").trim();
}

function extractFlagValues(command: string, flags: string[]) {
  const values: string[] = [];
  const escapedFlags = flags.map((flag) => escapeRegExp(flag)).join("|");
  const pattern = new RegExp(`(?:^|\\s)(?:${escapedFlags})\\s+(?:"([^"]*)"|'([^']*)'|([^\\s\\\\]+))`, "g");

  for (const match of command.matchAll(pattern)) {
    values.push((match[1] ?? match[2] ?? match[3] ?? "").trim());
  }

  return values.filter(Boolean);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
