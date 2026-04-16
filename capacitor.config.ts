import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.networkking.app',
  appName: 'Networ.King',
  webDir: 'public',
  server: {
    url: 'https://networkking.app',
    cleartext: true
  }
};

export default config;