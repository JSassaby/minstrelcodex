import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, googleToken, fileId, fileName, content, mimeType } = await req.json();

    if (!googleToken) {
      return new Response(JSON.stringify({ error: 'Google access token required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeaders = {
      'Authorization': `Bearer ${googleToken}`,
    };

    switch (action) {
      case 'list': {
        // List text files in Drive, specifically in a "Private Writer" folder
        const q = encodeURIComponent(
          "mimeType='text/plain' or mimeType='text/html' or mimeType='application/vnd.google-apps.document'"
        );
        const res = await fetch(
          `${DRIVE_API}/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=50`,
          { headers: authHeaders }
        );
        const data = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: data.error?.message || 'Failed to list files' }), {
            status: res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ files: data.files || [] }), {
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
        // Get file metadata first
        const metaRes = await fetch(`${DRIVE_API}/files/${fileId}?fields=mimeType,name`, {
          headers: authHeaders,
        });
        const meta = await metaRes.json();

        let fileContent: string;
        if (meta.mimeType === 'application/vnd.google-apps.document') {
          // Export Google Docs as HTML
          const exportRes = await fetch(
            `${DRIVE_API}/files/${fileId}/export?mimeType=text/html`,
            { headers: authHeaders }
          );
          fileContent = await exportRes.text();
        } else {
          // Download regular files
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

        const metadata = {
          name: fileName,
          mimeType: mimeType || 'text/html',
        };

        // If fileId provided, update existing file
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

        // Create new file
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
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
