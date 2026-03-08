import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

// Validate Google Drive IDs (alphanumeric, hyphens, underscores, or 'root')
function isValidDriveId(id: string | undefined | null): boolean {
  if (!id) return true; // optional fields
  return id === 'root' || /^[a-zA-Z0-9_-]+$/.test(id);
}

// Validate folder/file names (reject path traversal and control chars)
function isValidName(name: string | undefined | null): boolean {
  if (!name) return true;
  return name.length <= 255 && !/[\/\\\x00-\x1f]/.test(name);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, googleToken, fileId, folderId, fileName, folderName, content, mimeType, parentId } = await req.json();

    if (!googleToken) {
      return new Response(JSON.stringify({ error: 'Google access token required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate all Drive IDs
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

    const authHeaders = {
      'Authorization': `Bearer ${googleToken}`,
    };

    switch (action) {
      case 'list': {
        const parent = folderId || 'root';
        const q = encodeURIComponent(`'${parent}' in parents and trashed = false`);
        const fields = encodeURIComponent('nextPageToken,files(id,name,mimeType,modifiedTime,size,parents)');
        const allFiles: unknown[] = [];
        let pageToken: string | undefined;
        do {
          let url = `${DRIVE_API}/files?q=${q}&fields=${fields}&orderBy=folder,name&pageSize=1000`;
          if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
          const res = await fetch(url, { headers: authHeaders });
          const data = await res.json();
          if (!res.ok) {
            return new Response(JSON.stringify({ error: data.error?.message || 'Failed to list files' }), {
              status: res.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          allFiles.push(...(data.files || []));
          pageToken = data.nextPageToken;
        } while (pageToken);
        return new Response(JSON.stringify({ files: allFiles }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'find-or-create-folder': {
        // Find existing folder by name under parentId, or create it
        if (!folderName) {
          return new Response(JSON.stringify({ error: 'folderName required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const parent = parentId || 'root';
        // Search for existing folder with this name under parent
        const searchQ = encodeURIComponent(
          `'${parent}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
        );
        const searchRes = await fetch(
          `${DRIVE_API}/files?q=${searchQ}&fields=${encodeURIComponent('files(id,name)')}&pageSize=1`,
          { headers: authHeaders }
        );
        const searchData = await searchRes.json();
        if (searchRes.ok && searchData.files?.length > 0) {
          // Found existing folder
          return new Response(JSON.stringify({ folder: searchData.files[0] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        // Create new folder
        const metadata: Record<string, unknown> = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parent],
        };
        const res = await fetch(`${DRIVE_API}/files`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(metadata),
        });
        const data = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: data.error?.message || 'Failed to create folder' }), {
            status: res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ folder: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create-folder': {
        if (!folderName) {
          return new Response(JSON.stringify({ error: 'folderName required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const metadata: Record<string, unknown> = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        };
        if (parentId) metadata.parents = [parentId];
        const res = await fetch(`${DRIVE_API}/files`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(metadata),
        });
        const data = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: data.error?.message || 'Failed to create folder' }), {
            status: res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ folder: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'download': {
        if (!fileId) {
          return new Response(JSON.stringify({ error: 'fileId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const metaRes = await fetch(`${DRIVE_API}/files/${fileId}?fields=mimeType,name`, {
          headers: authHeaders,
        });
        const meta = await metaRes.json();

        let fileContent: string;
        if (meta.mimeType === 'application/vnd.google-apps.document') {
          const exportRes = await fetch(
            `${DRIVE_API}/files/${fileId}/export?mimeType=text/html`,
            { headers: authHeaders }
          );
          fileContent = await exportRes.text();
        } else {
          const dlRes = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
            headers: authHeaders,
          });
          fileContent = await dlRes.text();
        }

        return new Response(JSON.stringify({ content: fileContent, name: meta.name }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'upload': {
        if (!fileName || content === undefined) {
          return new Response(JSON.stringify({ error: 'fileName and content required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const metadata: Record<string, unknown> = {
          name: fileName,
          mimeType: mimeType || 'text/html',
        };
        if (parentId) metadata.parents = [parentId];

        if (fileId) {
          const res = await fetch(`${UPLOAD_API}/files/${fileId}?uploadType=multipart`, {
            method: 'PATCH',
            headers: {
              ...authHeaders,
              'Content-Type': 'multipart/related; boundary=boundary',
            },
            body: `--boundary\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--boundary\r\nContent-Type: ${mimeType || 'text/html'}\r\n\r\n${content}\r\n--boundary--`,
          });
          const data = await res.json();
          if (!res.ok) {
            return new Response(JSON.stringify({ error: data.error?.message || 'Upload failed' }), {
              status: res.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ file: data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart`, {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'multipart/related; boundary=boundary',
          },
          body: `--boundary\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--boundary\r\nContent-Type: ${mimeType || 'text/html'}\r\n\r\n${content}\r\n--boundary--`,
        });
        const data = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: data.error?.message || 'Upload failed' }), {
            status: res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ file: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Google Drive error:', msg);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
