

## Fix Novel Project Wizard: Remove iCloud/Dropbox and Fix Google Drive Status

### Problem
The Novel Project Wizard has three issues:
1. **iCloud and Dropbox options are still showing** in the Storage Location section (lines 542-543) despite being requested for removal
2. **Google Drive shows as "LINKED"** incorrectly because it checks `session.provider === 'google' || !!session.provider_token` (line 187) which can be true even without a valid Drive token
3. **References to iCloud/Dropbox** remain in the preview panel text (line 684) and linking logic (lines 626-650)

### Changes

**1. Remove iCloud and Dropbox from storage options** (`NovelProjectWizard.tsx`)
- Remove the `icloud` and `dropbox` entries from the `StorageLocation` type (line 6)
- Remove those two buttons from the storage options array (lines 542-543)
- Clean up the preview text (line 684) and linking logic (lines 626-650) to remove iCloud/Dropbox references
- Remove the `apple` field from `connectedProviders` state since it's no longer used

**2. Fix Google Drive connected status** (`NovelProjectWizard.tsx`)
- Replace the local session-based check (lines 180-195) with the same `useGoogleToken` hook used everywhere else, so the wizard and the Settings/StorageMenu all agree on whether Drive is linked

**3. Consistency**
- The wizard will use `useGoogleToken().isConnected` for the "LINKED / NOT LINKED" badge, matching what Settings and StorageMenu display

### Technical Details

- The `StorageLocation` type changes from `'local' | 'google-drive' | 'icloud' | 'dropbox'` to `'local' | 'google-drive'`
- The `connectedProviders` state and its `useEffect` (lines 178-195) will be replaced by importing `useGoogleToken`
- The storage options array will only have Local Storage and Google Drive
- The preview panel storage label (line 684) will only handle `'local'` and `'google-drive'`
- The linking prompt section (lines 626-650) will only reference Google Drive

