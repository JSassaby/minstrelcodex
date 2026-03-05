import type { CloudAdapter, RemoteFile } from './CloudAdapter';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive`;

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string; // ISO string
  size?: string;
  parents?: string[];
}

export class GoogleDriveAdapter implements CloudAdapter {
  readonly name = 'Google Drive';

  private token: string | null;
  private folderId: string;

  // Cache of localId → driveFileId, loaded lazily on first list()
  private driveFileMap: Map<string, string> = new Map();
  private listed = false;

  constructor(token: string | null, folderId = 'root') {
    this.token = token;
    this.folderId = folderId;
  }

  isConnected(): boolean {
    return !!this.token;
  }

  async list(): Promise<Map<string, RemoteFile>> {
    if (!this.token) return new Map();

    let files: DriveFile[] = [];
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', googleToken: this.token, folderId: this.folderId }),
      });
      if (!res.ok) return new Map();
      const data = await res.json() as { files?: DriveFile[] };
      files = data.files ?? [];
    } catch {
      return new Map();
    }

    // Rebuild driveFileMap from live listing
    this.driveFileMap.clear();
    const result = new Map<string, RemoteFile>();
    for (const f of files) {
      // Drive file name IS the local doc ID
      this.driveFileMap.set(f.name, f.id);
      result.set(f.name, {
        id: f.id,
        name: f.name,
        modifiedTime: new Date(f.modifiedTime).getTime(),
      });
    }
    this.listed = true;
    return result;
  }

  async pull(remoteId: string): Promise<string | null> {
    if (!this.token) return null;
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download', googleToken: this.token, fileId: remoteId }),
      });
      if (!res.ok) return null;
      const data = await res.json() as { content?: string };
      return data.content ?? null;
    } catch {
      return null;
    }
  }

  async push(localId: string, content: string, remoteId?: string): Promise<string | null> {
    if (!this.token) return null;

    // Ensure we have an up-to-date driveFileMap if not already listed
    if (!this.listed) {
      await this.list();
    }

    const existingId = remoteId ?? this.driveFileMap.get(localId);

    try {
      const body: Record<string, string> = {
        action: 'upload',
        googleToken: this.token,
        fileName: localId,
        content,
        mimeType: 'text/plain',
        parentId: this.folderId,
      };
      if (existingId) body.fileId = existingId;

      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      const data = await res.json() as { file?: { id?: string } };
      const newId = data.file?.id ?? null;
      if (newId) this.driveFileMap.set(localId, newId);
      return newId;
    } catch {
      return null;
    }
  }
}
