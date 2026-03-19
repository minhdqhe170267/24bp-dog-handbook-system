import { create } from 'zustand';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { offlineCacheDBService } from '../database/services/offlineCacheDBService';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  lastOnlineAt: string | null;

  // Callbacks registered by other modules (e.g. sync engine)
  _onRestoredCallbacks: Array<() => void>;

  setNetworkState: (state: NetInfoState) => void;
  startListening: () => () => void;
  onNetworkRestored: (cb: () => void) => () => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isConnected: true,
  isInternetReachable: null,
  connectionType: null,
  lastOnlineAt: null,
  _onRestoredCallbacks: [],

  setNetworkState: (netState: NetInfoState) => {
    const prev = get();
    const nowConnected = netState.isConnected ?? false;
    const nowReachable = netState.isInternetReachable;
    const isOnline = nowConnected && nowReachable !== false;
    const wasOffline = !prev.isConnected || prev.isInternetReachable === false;

    const now = new Date().toISOString();

    if (isOnline) {
      // Persist last online timestamp
      offlineCacheDBService.set('last_online_at', now).catch(() => {});

      if (wasOffline && prev.lastOnlineAt) {
        const offlineMs = Date.now() - new Date(prev.lastOnlineAt).getTime();
        const offlineMin = Math.round(offlineMs / 60000);
        console.log(`[NET] Restored after ${offlineMin}m offline`);

        // Notify subscribers (e.g. sync engine)
        for (const cb of get()._onRestoredCallbacks) {
          try { cb(); } catch {}
        }
      } else if (wasOffline) {
        console.log('[NET] Online');
      }
    } else if (!isOnline && (prev.isConnected || prev.isInternetReachable !== false)) {
      console.log('[NET] Offline');
    }

    set({
      isConnected: nowConnected,
      isInternetReachable: nowReachable,
      connectionType: netState.type ?? null,
      lastOnlineAt: isOnline ? now : prev.lastOnlineAt,
    });
  },

  startListening: () => {
    // Hydrate lastOnlineAt from cache
    offlineCacheDBService.get('last_online_at').then((val) => {
      if (val) set({ lastOnlineAt: val });
    }).catch(() => {});

    const unsubscribe = NetInfo.addEventListener((state) => {
      get().setNetworkState(state);
    });

    return unsubscribe;
  },

  onNetworkRestored: (cb: () => void) => {
    set((s) => ({ _onRestoredCallbacks: [...s._onRestoredCallbacks, cb] }));
    return () => {
      set((s) => ({ _onRestoredCallbacks: s._onRestoredCallbacks.filter((fn) => fn !== cb) }));
    };
  },
}));
