

## Plan: Clean Up Storage Menu Items

### Changes

**1. Remove "Google Drive..." from the File menu** (`src/components/private-writer/MenuBar.tsx`)
- Delete the line with `action: 'gdrive'` from the `file` case in `getSubmenuItems` (line 60)
- Also remove the trailing separator before it (line 58) since "File Browser" will be the last item

**2. Remove iCloud and Dropbox from Settings Panel Storage tab** (`src/components/private-writer/SettingsPanel.tsx`)
- Remove the iCloud row (lines 826-834)
- Remove the Dropbox row (lines 835-838)
- Update the keyboard navigation `actions` array (line 195) to remove `'dropbox'` and `'icloud'`
- Clean up `onConnectApple` prop usage since it's no longer needed in this component

**3. Clean up StorageMenu component** (`src/components/private-writer/StorageMenu.tsx`)
- Remove the iCloud/Apple section (the separator + iCloud connect/sync items)
- Remove `appleConnected`, `onSyncICloud`, `onConnectApple` props
- Remove the Apple status indicator from the header

### Technical Details

- The `StorageMenu` interface will be simplified to only handle Google Drive
- The `SettingsPanel` interface still accepts `onConnectApple` but we'll remove that prop requirement
- The storage tab in Settings will show: Local Storage, USB, and Google Drive only
- No functional changes to Google Drive -- just removal of non-functional placeholders

