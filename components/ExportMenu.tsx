import React from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import Icon from "@/components/Icon";
import Colors from "@/constants/colors";
import { useLanguage } from "@/lib/i18n";

interface ExportMenuProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onPdf: () => void;
  onExcel: () => void;
}

export default function ExportMenu({
  visible,
  title,
  subtitle,
  onClose,
  onPdf,
  onExcel,
}: ExportMenuProps) {
  const { tr } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <Pressable
            onPress={() => {
              onClose();
              setTimeout(onPdf, 100);
            }}
            style={({ pressed }) => [styles.option, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#EF444422" }]}>
              <Icon name="file-text" size={22} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>{tr.exportDownloadPdf}</Text>
              <Text style={styles.optionDesc}>{tr.exportPdfDescription}</Text>
            </View>
            <Icon name="download" size={18} color={Colors.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => {
              onClose();
              setTimeout(onExcel, 100);
            }}
            style={({ pressed }) => [styles.option, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#10B98122" }]}>
              <Icon name="file-text" size={22} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>{tr.exportDownloadExcel}</Text>
              <Text style={styles.optionDesc}>{tr.exportExcelDescription}</Text>
            </View>
            <Icon name="download" size={18} color={Colors.textMuted} />
          </Pressable>

          <Pressable onPress={onClose} style={({ pressed }) => [styles.cancel, { opacity: pressed ? 0.7 : 1 }]}>
            <Text style={styles.cancelText}>{tr.cancel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.modalBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 8,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  optionDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  cancel: { alignSelf: "center", paddingVertical: 8, paddingHorizontal: 16, marginTop: 4 },
  cancelText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textSecondary },
});
