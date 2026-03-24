import { CliError, ERROR_CODES } from '../errors.js';

type InvestecErrorContext =
  | 'card-api-auth'
  | 'card-api-request'
  | 'pb-api-auth'
  | 'pb-api-request';

const INVESTEC_ERROR_CONTEXT_MESSAGES: Record<InvestecErrorContext, string> = {
  'card-api-auth': 'Failed to authenticate with the Investec Card API',
  'card-api-request': 'Investec Card API request failed',
  'pb-api-auth': 'Failed to authenticate with the Investec Programmable Banking API',
  'pb-api-request': 'Investec Programmable Banking API request failed',
};

function extractInvestecErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (error instanceof CliError) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    const axiosResponse = (error as { response?: { status?: number; statusText?: string; data?: unknown } })
      .response;
    if (axiosResponse) {
      const parts: string[] = [];
      if (typeof axiosResponse.status === 'number') {
        parts.push(`status ${axiosResponse.status}`);
      }
      if (typeof axiosResponse.statusText === 'string' && axiosResponse.statusText !== '') {
        parts.push(axiosResponse.statusText);
      }
      const responseData = axiosResponse.data;
      if (typeof responseData === 'string' && responseData.trim() !== '') {
        parts.push(responseData.trim());
      } else if (
        responseData &&
        typeof responseData === 'object' &&
        Object.keys(responseData as Record<string, unknown>).length > 0
      ) {
        try {
          parts.push(JSON.stringify(responseData));
        } catch {
          // Ignore serialization errors
        }
      }
      if (parts.length > 0) {
        return parts.join(' - ');
      }
    }

    if (error.message) {
      return error.message;
    }
  }

  if (typeof error === 'object' && 'message' in (error as Record<string, unknown>)) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim() !== '') {
      return message;
    }
  }

  return null;
}

export function normalizeInvestecError(error: unknown, context: InvestecErrorContext): CliError {
  if (error instanceof CliError) {
    return error;
  }

  const baseMessage = INVESTEC_ERROR_CONTEXT_MESSAGES[context] ?? 'Investec API error';
  const detail = extractInvestecErrorMessage(error);
  const message = detail ? `${baseMessage}: ${detail}` : baseMessage;

  return new CliError(ERROR_CODES.INVESTEC_API_ERROR, message);
}
