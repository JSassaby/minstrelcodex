import type { CloudAdapter, RemoteFile } from './CloudAdapter';
import { TokenExpiredError } from './CloudAdapter';

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

  private driveFileMap: Map<string, string> = new Map();
  private folderIdCache: Map<string, string> = new Map();
  private listed = false;

  constructor(token: string | null, folderId = 'root') {
    this.token = token;
    this.folderId = folderId;
  }

  isConnected(): boolean {
    return !!this.token;
  }

  private async edgeFetch(body: Record<string, unknown>): Promise<Response> {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, googleToken: this.token }),
    });
    if (res.status === 401) throw new TokenExpiredError();
    return res;
  }

  private async listFolder(
    parentId: string,
    prefix: string,
    result: Map<string, RemoteFile>
  ): Promise<void> {
    const res = await this.edgeFetch({ action: 'list', folderId: parentId });
    if (!res.ok) return;
    const data = await res.json() as { files?: DriveFile[] };
    for (const f of data.files ?? []) {
      if (f.mimeType === 'application/vnd.google-apps.folder') {
        const folderPath = prefix ? prefix + f.name : f.name;
        this.folderIdCache.set(folderPath, f.id);
        await this.listFolder(f.id, folderPath + '/', result);
      } else {
        const localId = prefix + f.name;
        this.driveFileMap.set(localId, f.id);
        result.set(localId, {
          id: f.id,
          name: localId,
          modifiedTime: new Date(f.modifiedTime).getTime(),
        });
      }
    }
  }

  async list(): Promise<Map<string, RemoteFile>> {
    if (!this.token) return new Map();
    this.driveFileMap.clear();
    this.folderIdCache.clear();
    const result = new Map<string, RemoteFile>();
    await this.listFolder(this.folderId, '', result);
    this.listed = true;
    return result;
  }

  async pull(remoteId: string): Promise<string | null> {
    if (!this.token) return null;
    const res = await this.edgeFetch({ action: 'download', fileId: remoteId });
    if (!res.ok) return null;
    const data = await res.json() as { content?: string };
    return data.content ?? null;
  }

  private async ensureFolderPath(parts: string[]): Promise<string> {
    let currentParentId = this.folderId;
    let currentPath = '';
    for (const part of parts) {
      currentPath = currentPath ? currentPath + '/' + part : part;
      if (this.folderIdCache.has(currentPath)) {
        currentParentId = this.folderIdCache.get(currentPath)!;
        continue;
      }
      const res = await this.edgeFetch({ action: 'create-folder', folderName: part, parentId: currentParentId });
      if (res.ok) {
        const data = await res.json() as { folder?: { id?: string } };
        const fid = data.folder?.id;
        if (fid) {
          this.folderIdCache.set(currentPath, fid);
          currentParentId = fid;
        }
      }
    }
    return currentParentId;
  }

  async push(localId: string, content: string): Promise<string | null> {
    if (!this.token) return null;
    if (!this.listed) await this.list();

    const parts = localId.split('/');
    const fileName = parts.pop()!;
    const parentId = parts.length > 0
      ? await this.ensureFolderPath(parts)
      : this.folderId;

    const existingId = this.driveFileMap.get(localId);
    const body: Record<string, unknown> = {
      action: 'upload',
      fileName,
      content,
      mimeType: 'text/plain',
      parentId,
    };
    if (existingId) body.fileId = existingId;

    const res = await this.edgeFetch(body);
    if (!res.ok) return null;
    const data = await res.json() as { file?: { id?: string } };
    const newId = data.file?.id ?? null;
    if (newId) this.driveFileMap.set(localId, newId);
    return newId;
  }
}
