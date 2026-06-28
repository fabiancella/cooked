import { ExtensionStorage } from '@bacons/apple-targets';
import { Platform } from 'react-native';

const APP_GROUP_IDENTIFIER = 'group.com.fabiancella.cooked';
const PENDING_SHARED_IMPORT_KEY = 'pendingSharedImport';

const storage = new ExtensionStorage(APP_GROUP_IDENTIFIER);

export function getPendingSharedImport() {
  console.log('[CookedShare] main app checking pending import');

  if (Platform.OS !== 'ios') {
    console.log('[CookedShare] pending import not found');
    return null;
  }

  const pendingImport = storage.get(PENDING_SHARED_IMPORT_KEY);

  if (!pendingImport) {
    console.log('[CookedShare] pending import not found');
    return null;
  }

  console.log('[CookedShare] pending import found');
  return pendingImport;
}

export function clearPendingSharedImport() {
  if (Platform.OS !== 'ios') {
    return;
  }

  storage.remove(PENDING_SHARED_IMPORT_KEY);
  console.log('[CookedShare] pending import cleared');
}
