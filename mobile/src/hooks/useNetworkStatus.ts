import { useNetworkStore } from '../stores/networkStore';

export const useNetworkStatus = () => {
  const { isConnected, isInternetReachable, connectionType, lastOnlineAt } = useNetworkStore();

  return {
    isOnline: isConnected && isInternetReachable !== false,
    isOffline: !isConnected || isInternetReachable === false,
    connectionType,
    lastOnlineAt,
  };
};
