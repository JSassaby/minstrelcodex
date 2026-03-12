// No top-level imports needed — Deno.serve is built into the runtime.
// Using Deno.serve instead of the std-library shim avoids boot crashes on
// modern Supabase edge-function runtimes.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FETCH_TIMEOUT = 25000; // 25 s — well within Supabase 60 s wall limit

// Validate Google Drive IDs (alphanumeric, hyphens, underscores, or 'root')
function isValidDriveId(id: string | undefined | null): boolean {
  if (!id) return true;
  return id === 'root' || /^[a-zA-Z0-9_-]+$/.test(id);
}

// Validate folder/file names (reject path traversal and control chars)
function isValidName(name: string | undefined | null): boolean {
  if (!name) return true;
  return name.length <= 255 && !/[/\\\x00-\x1f]/.test(name);
}

// refreshAccessToken reads env vars inside the function body so they are
// never accessed at module load time (avoids potential boot-time errors).
async function refreshAccessToken(rt: string): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    console.log('[google-drive] token refresh skipped — GOOGLE_CLIENT_ID/SECRET not set');
    return null;
  }
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: rt,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.log('[google-drive] token refresh failed, status:', res.status);
      return null;
    }
    const data = await res.json();
    return (data.access_token as string) ?? null;
  } catch (e) {
    console.log('[google-drive] token refresh error:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

Deno.serve(async (req: Request) => {
  // Confirm the handler is being reached — visible in Supabase function logs.
  console.log('google-drive: request received', req.method, req.url);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      action,
      accessToken,
      refreshToken,
      fileId,
      folderId,
      fileName,
      folderName,
      content,
      mimeType,
      parentId,
    } = body;

    console.log('[google-drive] action:', action, '| accessToken present:', !!accessToken);

    if (!accessToken) {
      console.log('[google-drive] rejected — no accessToken in request body');
      return new Response(JSON.stringify({ error: 'Google access token required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate Drive IDs
    for (const [name, value] of [['fileId', fileId], ['folderId', folderId], ['parentId', parentId]] as const) {
      if (value && !isValidDriveId(value as string)) {
        return new Response(JSON.stringify({ error: `Invalid ${name}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate names
    for (const [name, value] of [['fileName', fileName], ['folderName', folderName]] as const) {
      if (value && !isValidName(value as string)) {
        return new Response(JSON.stringify({ error: `Invalid ${name}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Per-request mutable token — updated if a refresh occurs mid-request
    let currentToken = accessToken as string;
    let newAccessToken: string | undefined;

    async function driveRequest(url: string, options: RequestInit = {}): Promise<Response> {
      const doFetch = (token: string) =>
        fetch(url, {
          ...options,
          headers: {
            ...(options.headers as Record<string, string> | undefined),
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT),
        });

      let res = await doFetch(currentToken);
      console.log('[google-drive] fetch', url.split('?')[0], '->', res.status);

      if (res.status === 401 && refreshToken) {
        console.log('[google-drive] 401 — attempting token refresh');
        const fresh = await refreshAccessToken(refreshToken as string);
        if (fresh) {
          currentToken = fresh;
          newAccessToken = fresh;
          res = await doFetch(currentToken);
          console.log('[google-drive] retry after refresh ->', res.status);
        }
      }

      return res;
    }

    function jsonOk(data: unknown): Response {
      const payload = newAccessToken ? { ...(data as object), newAccessToken } : data;
      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    function jsonErr(message: string, status: number): Response {
      console.log('[google-drive] error', status, message);
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'list': {
        // Under drive.file scope never query 'root' — that can stall.
        if (!folderId || folderId === 'root') {
          return jsonErr('folderId required for list (drive.file scope)', 400);
        }
        const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
        const fields = encodeURIComponent('nextPageToken,files(id,name,mimeType,modifiedTime,size,parents)');
        const allFiles: unknown[] = [];
        let pageToken: string | undefined;
        let pageCount = 0;
        do {
          if (++pageCount > 20) {
            console.log('[google-drive] list: safety page-limit reached');
            break;
          }
          let url = `${DRIVE_API}/files?q=${q}&fields=${fields}&orderBy=folder,name&pageSize=1000&spaces=drive`;
          if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
          const res = await driveRequest(url);
          const data = await res.json();
          if (!res.ok) return jsonErr(data.error?.message || 'Failed to list files', res.status);
          allFiles.push(...(data.files || []));
          pageToken = data.nextPageToken;
        } while (pageToken);
        return jsonOk({ files: allFiles });
      }

      case 'find-or-create-folder': {
        if (!folderName) return jsonErr('folderName required', 400);

        // Under drive.file scope, omit the parent constraint when the parent
        // would be 'root' — that query can stall. drive.file already filters
        // results to app-created files so false positives can't occur.
        const knownParent = parentId && parentId !== 'root' ? (parentId as string) : null;
        const nameClause = `name = '${(folderName as string).replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const searchQ = encodeURIComponent(
          knownParent ? `'${knownParent}' in parents and ${nameClause}` : nameClause
        );
        const searchRes = await driveRequest(
          `${DRIVE_API}/files?q=${searchQ}&fields=${encodeURIComponent('files(id,name)')}&pageSize=1&spaces=drive`
        );
        const searchData = await searchRes.json();
        if (searchRes.ok && searchData.files?.length > 0) {
          console.log('[google-drive] find-or-create: found', searchData.files[0].id);
          return jsonOk({ folder: searchData.files[0] });
        }

        const metadata: Record<string, unknown> = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        };
        if (knownParent) metadata.parents = [knownParent];
        const res = await driveRequest(`${DRIVE_API}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metadata),
        });
        const data = await res.json();
        if (!res.ok) return jsonErr(data.error?.message || 'Failed to create folder', res.status);
        console.log('[google-drive] find-or-create: created', data.id);
        return jsonOk({ folder: data });
      }

      case 'create-folder': {
        if (!folderName) return jsonErr('folderName required', 400);
        const metadata: Record<string, unknown> = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        };
        if (parentId && parentId !== 'root') metadata.parents = [parentId];
        const res = await driveRequest(`${DRIVE_API}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metadata),
        });
        const data = await res.json();
        if (!res.ok) return jsonErr(data.error?.message || 'Failed to create folder', res.status);
        return jsonOk({ folder: data });
      }

      case 'download': {
        if (!fileId) return jsonErr('fileId required', 400);
        const metaRes = await driveRequest(`${DRIVE_API}/files/${fileId}?fields=mimeType,name`);
        const meta = await metaRes.json();
        if (!metaRes.ok) return jsonErr(meta.error?.message || 'Failed to get file metadata', metaRes.status);

        let fileContent: string;
        if (meta.mimeType === 'application/vnd.google-apps.document') {
          const exportRes = await driveRequest(`${DRIVE_API}/files/${fileId}/export?mimeType=text/html`);
          if (!exportRes.ok) return jsonErr('Failed to export document', exportRes.status);
          fileContent = await exportRes.text();
        } else {
          const dlRes = await driveRequest(`${DRIVE_API}/files/${fileId}?alt=media`);
          if (!dlRes.ok) return jsonErr('Failed to download file', dlRes.status);
          fileContent = await dlRes.text();
        }

        return jsonOk({ content: fileContent, name: meta.name });
      }

      case 'upload': {
        if (!fileName || content === undefined) {
          return jsonErr('fileName and content required', 400);
        }
        const metadata: Record<string, unknown> = {
          name: fileName,
          mimeType: mimeType || 'text/plain',
        };
        if (parentId && parentId !== 'root') metadata.parents = [parentId];

        const multipartBody =
          `--boundary\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n` +
          `--boundary\r\nContent-Type: ${mimeType || 'text/plain'}\r\n\r\n${content}\r\n--boundary--`;

        const uploadUrl = fileId
          ? `${UPLOAD_API}/files/${fileId}?uploadType=multipart`
          : `${UPLOAD_API}/files?uploadType=multipart`;
        const method = fileId ? 'PATCH' : 'POST';

        const res = await driveRequest(uploadUrl, {
          method,
          headers: { 'Content-Type': 'multipart/related; boundary=boundary' },
          body: multipartBody,
        });
        const data = await res.json();
        if (!res.ok) return jsonErr(data.error?.message || 'Upload failed', res.status);
        return jsonOk({ file: data });
      }

      case 'trash': {
        if (!fileId) return jsonErr('fileId required', 400);
        const res = await driveRequest(`${DRIVE_API}/files/${fileId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trashed: true }),
        });
        if (!res.ok) {
          const data = await res.json();
          return jsonErr(data.error?.message || 'Trash failed', res.status);
        }
        return jsonOk({ success: true });
      }

      default:
        return jsonErr(`Unknown action: ${action}`, 400);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[google-drive] unhandled error:', msg);
    const isTimeout =
      msg.includes('timed out') || msg.includes('AbortError') || msg.includes('abort');
    return new Response(
      JSON.stringify({ error: isTimeout ? 'Request timed out' : 'Internal server error' }),
      {
        status: isTimeout ? 504 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
