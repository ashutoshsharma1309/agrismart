export type UpstreamReason =
  | 'upstream_auth_failed'
  | 'upstream_rate_limited'
  | 'upstream_unavailable'
  | 'upstream_not_found';

export class UpstreamError extends Error {
  constructor(
    public reason: UpstreamReason,
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export function statusForReason(reason: UpstreamReason): number {
  switch (reason) {
    case 'upstream_not_found':
      return 404;
    case 'upstream_auth_failed':
    case 'upstream_rate_limited':
    case 'upstream_unavailable':
      return 503;
  }
}
