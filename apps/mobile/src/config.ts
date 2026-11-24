import Constants from "expo-constants";
import { Platform } from "react-native";

const strip = (s: string) => s.replace(/\/+$/, "");

// Get the IP address of your computer (e.g., 192.168.1.9) from Expo
const debuggerHost = Constants.expoConfig?.hostUri;
const localhostIP = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';

// Use localhost for Web, and the actual LAN IP for physical phones
const devApiUrl = Platform.OS === 'web' ? "http://localhost:4000" : `http://${localhostIP}:4000`;
const devWebOrigin = Platform.OS === 'web' ? "http://localhost:8081" : `http://${localhostIP}:8081`;

export const API_URL = strip(process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? devApiUrl : ""));
export const WEB_ORIGIN = strip(process.env.EXPO_PUBLIC_WEB_ORIGIN ?? (__DEV__ ? devWebOrigin : ""));

if (!__DEV__ && (!API_URL || !WEB_ORIGIN || !API_URL.startsWith("https://"))) {
  throw new Error("API_URL and WEB_ORIGIN must be set to https:// in production builds.");
}

export const LOCK_AFTER_MS = 30_000;
