type ProviderError = {
  status?: unknown;
  code?: unknown;
  type?: unknown;
  requestID?: unknown;
  headers?: Headers;
};

export type OpenAIRequestFailure = {
  status: number;
  code: string;
  message: string;
  providerCode?: string;
  providerType?: string;
  requestId?: string;
  retryAfterSeconds?: number;
};

function safeLabel(value: unknown) {
  return typeof value === "string" && /^[a-z0-9_.-]{1,80}$/i.test(value)
    ? value
    : undefined;
}

export function getOpenAIRequestFailure(error: unknown): OpenAIRequestFailure {
  const providerError = (typeof error === "object" && error !== null ? error : {}) as ProviderError;
  const status =
    typeof providerError.status === "number" && Number.isInteger(providerError.status)
      ? providerError.status
      : 502;
  const providerCode = safeLabel(providerError.code);
  const providerType = safeLabel(providerError.type);
  const requestId = safeLabel(providerError.requestID);
  const retryHeader = providerError.headers?.get("retry-after");
  const parsedRetryAfter = retryHeader === null || retryHeader === undefined ? undefined : Number(retryHeader);
  const retryAfterSeconds =
    parsedRetryAfter !== undefined && Number.isFinite(parsedRetryAfter) && parsedRetryAfter >= 0
      ? Math.min(Math.ceil(parsedRetryAfter), 86_400)
      : undefined;

  // Provider-side 429s are reported as 502: on the club deployment 429 means the visitor reached the
  // demo's own rate limit (the CTA) and 503 means the demo was paused, so neither may stand for a provider error.
  if (status === 429) {
    if (providerCode === "insufficient_quota" || providerCode === "billing_hard_limit_reached") {
      return {
        status: 502,
        code: "PROVIDER_QUOTA_EXHAUSTED",
        message: "The AI provider reports that this account has no available quota or credits. Check provider balance and spending limits.",
        providerCode,
        providerType,
        requestId,
      };
    }

    return {
      status: 502,
      code: providerCode === "rate_limit_exceeded" ? "PROVIDER_RATE_LIMITED" : "PROVIDER_429_UNCLASSIFIED",
      message: retryAfterSeconds
        ? `The AI provider is limiting requests. Try again in about ${retryAfterSeconds} seconds.`
        : "The AI provider returned HTTP 429. This can mean a temporary rate limit or insufficient quota; check provider usage, credits, and rate limits before retrying.",
      providerCode,
      providerType,
      requestId,
      retryAfterSeconds,
    };
  }

  if (status === 401 || status === 403) {
    return {
      status: 502,
      code: "PROVIDER_ACCESS_REJECTED",
      message: "The AI provider rejected authentication or model access. Check the configured API key and model permissions.",
      providerCode,
      providerType,
      requestId,
    };
  }

  return {
    status: 502,
    code: "PROVIDER_REQUEST_FAILED",
    message: "The AI provider could not complete the request. Check provider status and request details before retrying.",
    providerCode,
    providerType,
    requestId,
  };
}
