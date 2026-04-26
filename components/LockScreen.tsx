import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Icon from "@/components/Icon";
import Colors from "@/constants/colors";
import {
  AuthSettings,
  authenticateWithBiometric,
  isBiometricAvailable,
  verifyPin,
} from "@/lib/auth";

interface LockScreenProps {
  settings: AuthSettings;
  onUnlock: () => void;
}

const PIN_LENGTH = 6;
const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["bio", "0", "del"],
];

export default function LockScreen({ settings, onUnlock }: LockScreenProps) {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [bioAvailable, setBioAvailable] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  useEffect(() => {
    if (settings.biometricEnabled && Platform.OS !== "web") {
      tryBiometric();
    }
  }, []);

  const tryBiometric = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const ok = await authenticateWithBiometric("Desbloquear EcoEducacional");
    setBusy(false);
    if (ok) {
      onUnlock();
    }
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setPin("");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    Animated.sequence([
      Animated.timing(shake, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = async (key: string) => {
    if (busy) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      setError("");
      return;
    }
    if (key === "bio") {
      tryBiometric();
      return;
    }
    if (pin.length >= PIN_LENGTH) return;

    const next = pin + key;
    setPin(next);
    setError("");

    if (next.length === PIN_LENGTH) {
      setBusy(true);
      const ok = await verifyPin(next);
      setBusy(false);
      if (ok) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onUnlock();
      } else {
        triggerError("PIN incorreto. Tente novamente.");
      }
    }
  };

  const showBio = bioAvailable && settings.biometricEnabled;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0F1729", "#581C87", "#0F1729"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <View style={[styles.inner, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.header}>
          <View style={styles.lockIcon}>
            <Icon name="shield" size={36} color={Colors.primaryLight} />
          </View>
          <Text style={styles.title}>EcoEducacional</Text>
          <Text style={styles.subtitle}>Introduza o seu PIN para continuar</Text>
        </View>

        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shake }] }]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < pin.length && styles.dotFilled,
                error ? styles.dotError : null,
              ]}
            />
          ))}
        </Animated.View>

        {error ? <Text style={styles.errorText}>{error}</Text> : <View style={{ height: 18 }} />}

        <View style={styles.keypad}>
          {KEYS.map((row, ri) => (
            <View key={ri} style={styles.keyRow}>
              {row.map((k) => {
                if (k === "bio") {
                  if (!showBio) return <View key={k} style={styles.keyEmpty} />;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => handleKeyPress(k)}
                      style={({ pressed }) => [styles.key, styles.keyAlt, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Icon name="user" size={26} color={Colors.primaryLight} />
                    </Pressable>
                  );
                }
                if (k === "del") {
                  return (
                    <Pressable
                      key={k}
                      onPress={() => handleKeyPress(k)}
                      style={({ pressed }) => [styles.key, styles.keyAlt, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Icon name="chevron-back" size={24} color={Colors.text} />
                    </Pressable>
                  );
                }
                return (
                  <Pressable
                    key={k}
                    onPress={() => handleKeyPress(k)}
                    style={({ pressed }) => [styles.key, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={styles.keyText}>{k}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {showBio && (
          <Pressable onPress={tryBiometric} style={styles.bioHint}>
            <Text style={styles.bioHintText}>Tocar para usar biometria</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "space-between",
  },
  header: { alignItems: "center", gap: 8 },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(20,184,166,0.15)",
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  dotsRow: { flexDirection: "row", gap: 14, marginTop: 10 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryLight,
  },
  dotError: { borderColor: Colors.error },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.error,
    marginTop: 12,
    height: 18,
  },
  keypad: { gap: 14, marginTop: 8 },
  keyRow: { flexDirection: "row", gap: 18, justifyContent: "center" },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  keyAlt: { backgroundColor: "rgba(255,255,255,0.04)" },
  keyEmpty: { width: 72, height: 72 },
  keyText: { fontFamily: "Inter_600SemiBold", fontSize: 26, color: Colors.text },
  bioHint: { paddingVertical: 8 },
  bioHintText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.primaryLight,
    textDecorationLine: "underline",
  },
});
