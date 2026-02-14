import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getClasses, ClassGroup } from "@/lib/storage";

export default function AssessmentsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [classes, setClasses] = useState<ClassGroup[]>([]);

  useFocusEffect(
    useCallback(() => {
      getClasses().then(setClasses);
    }, []),
  );

  const renderClass = ({ item }: { item: ClassGroup }) => (
    <Pressable
      onPress={() => router.push({ pathname: "/student-grades", params: { turmaId: item.id } })}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.95 : 1 }]}
    >
      <View style={styles.cardIcon}>
        <MaterialCommunityIcons name="clipboard-check" size={22} color="#D97706" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.designacao}</Text>
        <Text style={styles.cardSubtitle}>{item.disciplina} - {item.alunos.length} alunos</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Avaliacoes</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={renderClass}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Sem turmas</Text>
            <Text style={styles.emptySubtitle}>Crie turmas primeiro para avaliar alunos</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 16, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  list: { padding: 20, gap: 12 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    borderRadius: 14, padding: 16, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F59E0B15", alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  cardSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 8 },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
});
