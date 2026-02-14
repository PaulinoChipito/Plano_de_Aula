import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getLessonPlans, deleteLessonPlan, LessonPlan } from "@/lib/storage";

export default function LessonPlansScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [plans, setPlans] = useState<LessonPlan[]>([]);

  useFocusEffect(
    useCallback(() => {
      getLessonPlans().then(setPlans);
    }, []),
  );

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar Plano", "Tem a certeza?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteLessonPlan(id);
          setPlans((p) => p.filter((plan) => plan.id !== id));
        },
      },
    ]);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return Colors.success;
    if (score >= 60) return Colors.warning;
    return Colors.error;
  };

  const renderPlan = ({ item }: { item: LessonPlan }) => (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/view-plan", params: { id: item.id } })
      }
      onLongPress={() => handleDelete(item.id)}
      style={({ pressed }) => [
        styles.planCard,
        { opacity: pressed ? 0.95 : 1 },
      ]}
    >
      <View style={styles.planHeader}>
        <View style={styles.planInfo}>
          <Text style={styles.planTema} numberOfLines={1}>
            {item.tema}
          </Text>
          <Text style={styles.planMeta}>
            {item.classe} - {item.disciplina}
          </Text>
        </View>
        <View
          style={[
            styles.scoreBadge,
            { backgroundColor: getScoreColor(item.score) + "15" },
          ]}
        >
          <Text
            style={[
              styles.scoreText,
              { color: getScoreColor(item.score) },
            ]}
          >
            {item.score}
          </Text>
        </View>
      </View>
      <View style={styles.planFooter}>
        <Text style={styles.planDate}>
          {new Date(item.createdAt).toLocaleDateString("pt-PT")}
        </Text>
        <Text style={styles.planDuracao}>{item.duracao} min</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Planos de Aula</Text>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web")
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/create-plan");
          }}
          style={({ pressed }) => [
            styles.addBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        renderItem={renderPlan}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPadding + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="file-text" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Sem planos de aula</Text>
            <Text style={styles.emptySubtitle}>
              Crie o seu primeiro plano com IA
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: Colors.primary + "15",
  },
  list: {
    padding: 20,
    gap: 12,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planInfo: {
    flex: 1,
    marginRight: 12,
  },
  planTema: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  planMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  planFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  planDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  planDuracao: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
