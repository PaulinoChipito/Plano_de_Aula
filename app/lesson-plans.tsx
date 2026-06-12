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
import Icon from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getLessonPlans, deleteLessonPlan, LessonPlan } from "@/lib/storage";
import { usePeriod } from "@/lib/periodContext";
import { useYear } from "@/lib/yearContext";
import { useLanguage } from "@/lib/i18n";

export default function LessonPlansScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const { currentPeriod, currentPeriodLabel } = usePeriod();
  const { currentYear, years } = useYear();
  const defaultYear = years[0] ?? "";
  const { tr } = useLanguage();

  useFocusEffect(
    useCallback(() => {
      getLessonPlans().then((all) =>
        setPlans(all.filter((p) => (p.anoLectivo ?? defaultYear) === currentYear && (p.periodo ?? "I") === currentPeriod)),
      );
    }, [currentPeriod, currentYear, defaultYear]),
  );

  const handleDelete = (id: string) => {
    Alert.alert(tr.deletePlan, tr.deletePlanConfirm, [
      { text: tr.cancel, style: "cancel" },
      {
        text: tr.delete,
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
        { opacity: pressed ? 0.85 : 1 },
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
            { backgroundColor: getScoreColor(item.score) + "25" },
          ]}
        >
          <Text
            style={[styles.scoreText, { color: getScoreColor(item.score) }]}
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
        <Text style={styles.headerTitle}>{tr.lessonPlansTitle} · {currentPeriodLabel}</Text>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web")
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/create-plan");
          }}
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="add" size={24} color={Colors.primaryLight} />
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
            <Icon name="file-text" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{tr.noPlans}</Text>
            <Text style={styles.emptySubtitle}>{tr.noPlansCta}</Text>
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
    backgroundColor: "rgba(15,23,42,0.7)",
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
    backgroundColor: "rgba(52,211,153,0.15)",
  },
  list: {
    padding: 20,
    gap: 12,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
