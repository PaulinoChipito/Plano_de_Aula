import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getLessonPlans, LessonPlan } from "@/lib/storage";

export default function ViewPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [plan, setPlan] = useState<LessonPlan | null>(null);

  useEffect(() => {
    getLessonPlans().then((plans) => {
      const found = plans.find((p) => p.id === id);
      if (found) setPlan(found);
    });
  }, [id]);

  if (!plan) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 60 }]}>
        <Text style={styles.emptyText}>Plano nao encontrado</Text>
      </View>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return Colors.success;
    if (score >= 60) return Colors.warning;
    return Colors.error;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {plan.tema}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{plan.classe}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{plan.disciplina}</Text>
          </View>
          <View style={styles.metaChip}>
            <Feather name="clock" size={12} color={Colors.primary} />
            <Text style={styles.metaChipText}>{plan.duracao} min</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: getScoreColor(plan.score) + "15" }]}>
            <Text style={[styles.metaChipText, { color: getScoreColor(plan.score) }]}>
              Score: {plan.score}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sumario</Text>
          <Text style={styles.sectionText}>{plan.sumario}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Objetivo Geral</Text>
          <Text style={styles.sectionText}>{plan.objetivoGeral}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Objetivos Especificos</Text>
          {plan.objetivosEspecificos.map((obj, i) => (
            <View key={i} style={styles.bulletItem}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{obj}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metodos de Ensino</Text>
          <Text style={styles.sectionText}>{plan.metodos}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meios de Ensino</Text>
          <Text style={styles.sectionText}>{plan.meios}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sequencia de Atividades</Text>
          {plan.atividades.map((at, i) => (
            <View key={i} style={styles.atividadeItem}>
              <View style={styles.atividadeNum}>
                <Text style={styles.atividadeNumText}>{i + 1}</Text>
              </View>
              <View style={styles.atividadeContent}>
                <Text style={styles.atividadeDesc}>{at.descricao}</Text>
                <Text style={styles.atividadeTempo}>{at.tempo}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perguntas de Controlo</Text>
          {plan.perguntasControlo.map((p, i) => (
            <View key={i} style={styles.bulletItem}>
              <Feather name="help-circle" size={14} color={Colors.primary} />
              <Text style={styles.bulletText}>{p}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perguntas de Tarefa</Text>
          {plan.perguntasTarefa.map((p, i) => (
            <View key={i} style={styles.bulletItem}>
              <Feather name="edit-3" size={14} color={Colors.accent} />
              <Text style={styles.bulletText}>{p}</Text>
            </View>
          ))}
        </View>

        {plan.sugestoes.length > 0 && (
          <View style={[styles.section, styles.sugestoesSection]}>
            <Text style={styles.sectionTitle}>Sugestoes de Melhoria</Text>
            {plan.sugestoes.map((s, i) => (
              <View key={i} style={styles.bulletItem}>
                <Feather name="zap" size={14} color={Colors.accent} />
                <Text style={styles.bulletText}>{s}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text, flex: 1, textAlign: "center" },
  content: { padding: 20, gap: 16 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 16, color: Colors.textSecondary, textAlign: "center" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary + "12",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.primary },
  section: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, gap: 8 },
  sugestoesSection: { backgroundColor: Colors.accent + "10" },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text, marginBottom: 4 },
  sectionText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  bulletItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 2 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 6 },
  bulletText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  atividadeItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  atividadeNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary + "15", alignItems: "center", justifyContent: "center" },
  atividadeNumText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.primary },
  atividadeContent: { flex: 1 },
  atividadeDesc: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  atividadeTempo: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.primary, marginTop: 2 },
});
