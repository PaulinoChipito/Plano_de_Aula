import { useEffect } from "react";
import { Platform, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";

WebBrowser.maybeCompleteAuthSession();

export default function GoogleDriveAuthCallbackScreen() {
  useEffect(() => {
    if (Platform.OS !== "web") {
      router.replace("/");
    }
  }, []);

  return <View />;
}
