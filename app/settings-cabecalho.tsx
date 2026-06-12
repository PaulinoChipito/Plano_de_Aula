import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { getExportHeader, saveExportHeader, ExportHeader } from "@/lib/storage";
import { useLanguage } from "@/lib/i18n";

export default function SettingsCabecalhoScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const { tr } = useLanguage();

  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<string[]>([""]);
  const [saved, setSaved] = useState(false);
  const [cropAspect, setCropAspect] = useState<[number, number] | undefined>([4, 2]);

  const CROP_OPTIONS: { labelKey: keyof typeof tr; value: [number, number] | undefined }[] = [
    { labelKey: "cropFree", value: undefined },
    { labelKey: "crop1x1", value: [1, 1] },
    { labelKey: "crop2x1", value: [4, 2] },
    { labelKey: "crop4x1", value: [4, 1] },
  ];

  useEffect(() => {
    getExportHeader().then((h) => {
      setLogoBase64(h.logoBase64);
      setLinhas(h.linhas.length > 0 ? h.linhas : [""]);
    });
  }, []);

  const handlePickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: cropAspect,
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mime = asset.mimeType || "image/jpeg";
          setLogoBase64(`data:${mime};base64,${asset.base64}`);
        } else if (asset.uri) {
          setLogoBase64(asset.uri);
        }
      }
    } catch {
      Alert.alert("Erro", "Não foi possível carregar a imagem.");
    }
  };

  const handleRemoveLogo = () => {
    setLogoBase64(null);
  };

  const handleAddLine = () => {
    setLinhas((prev) => [...prev, ""]);
  };

  const handleChangeLine = (idx: number, val: string) => {
    setLinhas((prev) => prev.map((l, i) => (i === idx ? val : l)));
  };

  const handleRemoveLine = (idx: number) => {
    if (linhas.length <= 1) {
      setLinhas([""]);
    } else {
      setLinhas((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleSave = async () => {
    const filteredLines = linhas.filter((l) => l.trim().length > 0);
    const header: ExportHeader = { logoBase64, linhas: filteredLines };
    await saveExportHeader(header);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasContent = logoBase64 || linhas.some((l) => l.trim().length > 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0F1729", "#581C87", "#0F1729"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{tr.headerTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>{tr.headerSubtitle}</Text>

        {/* Logo section */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <View style={[styles.sectionIconBox, { backgroundColor: "#10b98118" }]}>
              <Icon name="image" size={18} color="#10b981" />
            </View>
            <Text style={styles.sectionLabel}>{tr.headerLogo}</Text>
          </View>
          <Text style={styles.hint}>{tr.headerLogoHint}</Text>

          {/* Crop aspect ratio selector */}
          <View style={{ marginBottom: 4 }}>
            <Text style={[styles.hint, { marginBottom: 6 }]}>{tr.cropAspectRatio}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {CROP_OPTIONS.map((opt) => {
                const isSelected =
                  cropAspect === undefined
                    ? opt.value === undefined
                    : opt.value !== undefined &&
                      cropAspect[0] === opt.value[0] &&
                      cropAspect[1] === opt.value[1];
                return (
                  <Pressable
                    key={opt.labelKey}
                    onPress={() => setCropAspect(opt.value)}
                    style={[
                      styles.cropChip,
                      isSelected && styles.cropChipSelected,
                    ]}
                  >
                    <Text style={[styles.cropChipText, isSelected && styles.cropChipTextSelected]}>
                      {tr[opt.labelKey] as string}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {logoBase64 ? (
            <View style={styles.logoPreviewBox}>
              <Image
                source={{ uri: logoBase64 }}
                style={styles.logoPreviewImg}
                resizeMode="contain"
              />
              <Pressable
                onPress={handleRemoveLogo}
                style={({ pressed }) => [styles.removeLogoBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Icon name="trash-2" size={14} color={Colors.error} />
                <Text style={styles.removeLogoBtnText}>{tr.headerRemoveLogo}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handlePickLogo}
              style={({ pressed }) => [styles.addLogoBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Icon name="image" size={20} color="#10b981" />
              <Text style={styles.addLogoBtnText}>{tr.headerAddLogo}</Text>
            </Pressable>
          )}
        </View>

        {/* Text lines section */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <View style={[styles.sectionIconBox, { backgroundColor: "#10b98118" }]}>
              <Icon name="align-center" size={18} color="#10b981" />
            </View>
            <Text style={styles.sectionLabel}>{tr.headerLines}</Text>
          </View>
          <Text style={styles.hint}>{tr.headerLinesHint}</Text>

          <View style={styles.linesList}>
            {linhas.map((linha, i) => (
              <View key={i} style={styles.lineRow}>
                <TextInput
                  style={styles.lineInput}
                  value={linha}
                  onChangeText={(v) => handleChangeLine(i, v)}
                  placeholder={tr.headerLinePlaceholder}
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                />
                <Pressable
                  onPress={() => handleRemoveLine(i)}
                  style={({ pressed }) => [styles.lineRemoveBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Icon name="x" size={16} color={Colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>

          <Pressable
            onPress={handleAddLine}
            style={({ pressed }) => [styles.addLineBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Icon name="plus" size={16} color="#10b981" />
            <Text style={styles.addLineBtnText}>{tr.headerAddLine}</Text>
          </Pressable>
        </View>

        {/* Preview */}
        {hasContent && (
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>{tr.headerPreview}</Text>
            <View style={styles.previewBox}>
              {logoBase64 && (
                <Image
                  source={{ uri: logoBase64 }}
                  style={styles.previewLogo}
                  resizeMode="contain"
                />
              )}
              {linhas.filter((l) => l.trim()).map((l, i) => (
                <Text key={i} style={styles.previewLine}>{l}</Text>
              ))}
              <View style={styles.previewDivider} />
              <Text style={styles.previewDocTitle}>Nome do Documento</Text>
              <Text style={styles.previewMeta}>Turma: XX · Disciplina: YY · Ano Lectivo: 2025/2026</Text>
            </View>
          </View>
        )}

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.saveBtn, saved && styles.savedBtn, { opacity: pressed ? 0.9 : 1 }]}
        >
          <Icon name={saved ? "check" : "save"} size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{saved ? tr.headerSaved : tr.headerSave}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 16, backgroundColor: "rgba(15,23,42,0.7)",
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  content: { padding: 20, gap: 16 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  section: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, gap: 12, borderWidth: 1, borderColor: Colors.border },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIconBox: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  hint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  logoPreviewBox: { alignItems: "center", gap: 10 },
  logoPreviewImg: { width: "100%", height: 80, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.05)" },
  removeLogoBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: Colors.error + "12", borderWidth: 1, borderColor: Colors.error + "30",
  },
  removeLogoBtnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.error },
  addLogoBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1.5,
    borderColor: "#10b98140", borderStyle: "dashed" as any, backgroundColor: "#10b98108",
  },
  addLogoBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: "#10b981" },
  cropChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  cropChipSelected: {
    borderColor: "#10b981", backgroundColor: "#10b98120",
  },
  cropChipText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  cropChipTextSelected: { fontFamily: "Inter_600SemiBold", color: "#10b981" },
  linesList: { gap: 8 },
  lineRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  lineInput: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text,
  },
  lineRemoveBtn: {
    width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: Colors.border,
  },
  addLineBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
    backgroundColor: "#10b98110", alignSelf: "flex-start",
    borderWidth: 1, borderColor: "#10b98130",
  },
  addLineBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#10b981" },
  previewSection: { gap: 10 },
  previewLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  previewBox: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
    alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.border,
  },
  previewLogo: { width: 120, height: 50, marginBottom: 4 },
  previewLine: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#111", textAlign: "center" },
  previewDivider: { width: "100%", height: 1, backgroundColor: "#ccc", marginVertical: 8 },
  previewDocTitle: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#111", textTransform: "uppercase" },
  previewMeta: { fontFamily: "Inter_400Regular", fontSize: 10, color: "#555", textAlign: "center" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#10b981", borderRadius: 14, paddingVertical: 16,
  },
  savedBtn: { backgroundColor: Colors.success },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
