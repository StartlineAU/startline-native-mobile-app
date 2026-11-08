type AuthHeaderProvider = () => Promise<{ accessToken: string; idToken?: string } | null>;

let authHeaderProvider: AuthHeaderProvider = async () => null;

export function setApiAuthHeaderProvider(provider: AuthHeaderProvider) {
  authHeaderProvider = provider;
}

export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  try {
    const tokens = await authHeaderProvider();
    if (!tokens?.accessToken) return {};
    return {
      Authorization: `Bearer ${tokens.accessToken}`,
      ...(tokens.idToken ? { 'X-Id-Token': tokens.idToken } : {}),
    };
  } catch {
    return {};
  }
}
