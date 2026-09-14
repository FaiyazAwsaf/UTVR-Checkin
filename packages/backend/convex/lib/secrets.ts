/**
 * Secret handling for local/self-hosted development.
 *
 * Per-tenant credentials (e.g. a customer's own Vapi keys) are stored on the
 * `plugins` row for that organization. When an organization has not connected a
 * service yet, we fall back to the deployment-wide keys in `.env` so a single
 * developer account can exercise the whole flow without a real tenant setup.
 */

export type VapiCredentials = {
  publicApiKey: string;
  privateApiKey: string;
};

export type ServiceCredentials = {
  vapi: VapiCredentials;
};

export type Service = keyof ServiceCredentials;

/**
 * Deployment-wide fallback credentials, read from the Convex environment.
 * Returns null when the service has no complete set of keys configured.
 */
export function getCredentialsFromEnv<T extends Service>(
  service: T
): ServiceCredentials[T] | null {
  if (service === "vapi") {
    const publicApiKey = process.env.VAPI_PUBLIC_API_KEY;
    const privateApiKey = process.env.VAPI_PRIVATE_API_KEY;

    if (!publicApiKey || !privateApiKey) {
      return null;
    }

    return { publicApiKey, privateApiKey } as ServiceCredentials[T];
  }

  return null;
}

/**
 * True when every key the service needs is present and non-empty.
 */
export function areCredentialsComplete(
  service: Service,
  credentials: Partial<VapiCredentials> | null | undefined
): credentials is VapiCredentials {
  if (!credentials) {
    return false;
  }

  if (service === "vapi") {
    return Boolean(credentials.publicApiKey && credentials.privateApiKey);
  }

  return false;
}
