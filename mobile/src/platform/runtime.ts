import Constants, { ExecutionEnvironment } from "expo-constants";

/** Expo Go is the store client, not the custom native development build. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
