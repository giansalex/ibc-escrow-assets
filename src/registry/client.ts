const REGISTRY_BASE = "https://raw.githubusercontent.com/cosmos/chain-registry";
const GITHUB_API = "https://api.github.com/repos/cosmos/chain-registry";

export class RegistryClient {
  constructor(private readonly ref: string = "master") {}

  private rawUrl(path: string): string {
    return `${REGISTRY_BASE}/${this.ref}/${path}`;
  }

  async fetchJson<T>(path: string): Promise<T> {
    const url = path.startsWith("http") ? path : this.rawUrl(path);
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async listIbcFiles(): Promise<string[]> {
    const url = `${GITHUB_API}/contents/_IBC?ref=${this.ref}`;
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to list _IBC directory: ${response.status} ${response.statusText}`);
    }

    const entries = (await response.json()) as Array<{ name: string; type: string }>;
    return entries
      .filter((entry) => entry.type === "file" && entry.name.endsWith(".json"))
      .map((entry) => entry.name);
  }
}