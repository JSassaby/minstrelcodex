export interface RemoteFile {
  id: string;         // provider-specific file ID
  name: string;       // local doc key (the path used as document ID)
  modifiedTime: number; // unix ms
}

export class TokenExpiredError extends Error {
  constructor() {
    super('Google access token expired');
    this.name = 'TokenExpiredError';
  }
}

export interface CloudAdapter {
  /** Human-readable provider name */
  readonly name: string;

  /** Returns true when a token / session is available */
  isConnected(): boolean;

  /**
   * List all files managed by this adapter in the remote folder.
   * Returns a map from local doc ID → RemoteFile.
   */
  list(): Promise<Map<string, RemoteFile>>;

  /**
   * Download a single file by its remote ID.
   * Returns the content string or null if fetch fails.
   */
  pull(remoteId: string): Promise<string | null>;

  /**
   * Upload a document.
   * @param localId  - the doc key used in docsCache (e.g. "folder/file.txt")
   * @param content  - file content
   * @param remoteId - if provided, update existing file; otherwise create
   * @returns the remote file ID on success, null on failure
   */
  push(localId: string, content: string, remoteId?: string): Promise<string | null>;

  /**
   * Delete a remote file or folder (trash it).
   * @param remoteId - the provider-specific ID
   * @returns true on success
   */
  delete(remoteId: string): Promise<boolean>;
}
