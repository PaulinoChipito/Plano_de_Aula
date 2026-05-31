import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon, { IconName } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getEvents, saveEvent, deleteEvent, generateId, AgendaEvent } from "@/lib/storage";
import { usePeriod } from "@/lib/periodContext";
import HorarioSemanal from "@/components/HorarioSemanal";

const EVENT_TYPES = [
  { value: "aula" as const, label: "Aula", icon: "book-open", color: Colors.primary },
  { value: "prova" as const, label: "Prova", icon: "file-text", color: Colors.error },
  { value: "reuniao" as const, label: "Reuniao", icon: "users", color: "#6366F1" },
  { value: "lembrete" as const, label: "Lembrete", icon: "bell", color: Colors.accent },
];

type Tab = "agenda" | "horario";

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [activeTab, setActiveTab] = useState<Tab>("agenda");
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<AgendaEvent["tipo"]>("aula");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [hora, setHora] = useState("08:00");
  const [descricao, setDescricao] = useState("");
  const { currentPeriod, currentPeriodLabel } = usePeriod();

  useFocusEffect(
    useCallback(() => {
      getEvents().then((evts) => {
        setEvents(
          evts
            .filter((e) => (e.periodo ?? "I") === currentPeriod)
            .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora)),
        );
      });
    }, [currentPeriod]),
  );

  const handleCreate = async () => {
    if (!titulo.trim()) return;
    const event: AgendaEvent = {
      id: generateId(),
      titulo: titulo.trim(),
      tipo,
      data,
      hora,
      descricao: descricao.trim(),
      periodo: currentPeriod,
    };
    await saveEvent(event);
    setEvents((prev) =>
      [...prev, event].sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora)),
    );
    setTitulo("");
    setDescricao("");
    setShowModal(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar Evento", "Tem a certeza?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteEvent(id);
          setEvents((prev) => prev.filter((e) => e.id !== id));
        },
      },
    ]);
  };

  const getTypeConfig = (t: string) => {
    return EVENT_TYPES.find((et) => et.value === t) || EVENT_TYPES[0];
  };

  const groupedEvents: { date: string; events: AgendaEvent[] }[] = [];
  events.forEach((event) => {
    const existing = groupedEvents.find((g) => g.date === event.data);
    if (existing) {
      existing.events.push(event);
    } else {
      groupedEvents.push({ date: event.data, events: [event] });
    }
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.getTime() === today.getTime()) return "Hoje";
    if (d.getTime() === tomorrow.getTime()) return "Amanha";
    return d.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "short" });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0F1729", "#581C87", "#0F1729"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <Icon name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {activeTab === "agenda" ? "Agenda" : "Horário"}
          </Text>
        </View>
        {activeTab === "agenda" ? (
          <Pressable onPress={() => setShowModal(true)} style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Icon name="add" size={24} color={Colors.primary} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab("agenda")}
          style={[styles.tabBtn, activeTab === "agenda" && styles.tabBtnActive]}
        >
          <Icon
            name="calendar"
            size={14}
            color={activeTab === "agenda" ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.tabBtnText, activeTab === "agenda" && styles.tabBtnTextActive]}>
            Agenda
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("horario")}
          style={[styles.tabBtn, activeTab === "horario" && styles.tabBtnActive]}
        >
          <Icon
            name="clock"
            size={14}
            color={activeTab === "horario" ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.tabBtnText, activeTab === "horario" && styles.tabBtnTextActive]}>
            Horário do Professor
          </Text>
        </Pressable>
      </View>

      {/* Tab content */}
      {activeTab === "agenda" ? (
        <FlatList
          data={groupedEvents}
          keyExtractor={(item) => item.date}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: group }) => (
            <View style={styles.dateGroup}>
              <Text style={styles.dateLabel}>{formatDate(group.date)}</Text>
              {group.events.map((event) => {
                const config = getTypeConfig(event.tipo);
                return (
                  <Pressable
                    key={event.id}
                    onLongPress={() => handleDelete(event.id)}
                    style={({ pressed }) => [styles.eventCard, { opacity: pressed ? 0.95 : 1 }]}
                  >
                    <View style={[styles.eventTypeBar, { backgroundColor: config.color }]} />
                    <View style={styles.eventContent}>
                      <View style={styles.eventHeader}>
                        <Text style={styles.eventTitle}>{event.titulo}</Text>
                        <Text style={styles.eventTime}>{event.hora}</Text>
                      </View>
                      <View style={styles.eventMeta}>
                        <View style={[styles.eventTypeBadge, { backgroundColor: config.color + "15" }]}>
                          <Icon name={config.icon as IconName} size={12} color={config.color} />
                          <Text style={[styles.eventTypeText, { color: config.color }]}>{config.label}</Text>
                        </View>
                      </View>
                      {event.descricao ? (
                        <Text style={styles.eventDesc}>{event.descricao}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
          ListHeaderComponent={
            <View style={styles.periodBadge}>
              <Icon name="clock" size={11} color="#34D399" />
              <Text style={styles.periodBadgeText}>{currentPeriodLabel}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="calendar-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Agenda vazia</Text>
              <Text style={styles.emptySubtitle}>Adicione eventos ao seu calendario</Text>
            </View>
          }
        />
      ) : (
        <HorarioSemanal />
      )}

      {/* Modal (agenda only) */}
      {activeTab === "agenda" && (
        <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <Text style={styles.modalTitle}>Novo Evento</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Titulo"
                placeholderTextColor={Colors.textMuted}
                value={titulo}
                onChangeText={setTitulo}
              />

              <View style={styles.typeSelector}>
                {EVENT_TYPES.map((et) => (
                  <Pressable
                    key={et.value}
                    onPress={() => setTipo(et.value)}
                    style={[
                      styles.typeOption,
                      tipo === et.value && { backgroundColor: et.color + "20", borderColor: et.color },
                    ]}
                  >
                    <Icon name={et.icon as IconName} size={14} color={tipo === et.value ? et.color : Colors.textMuted} />
                    <Text style={[styles.typeOptionText, tipo === et.value && { color: et.color }]}>
                      {et.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.dateTimeRow}>
                <TextInput
                  style={[styles.modalInput, { flex: 1 }]}
                  placeholder="Data (AAAA-MM-DD)"
                  placeholderTextColor={Colors.textMuted}
                  value={data}
                  onChangeText={setData}
                />
                <TextInput
                  style={[styles.modalInput, { width: 90 }]}
                  placeholder="HH:MM"
                  placeholderTextColor={Colors.textMuted}
                  value={hora}
                  onChangeText={setHora}
                />
              </View>

              <TextInput
                style={[styles.modalInput, { minHeight: 60, textAlignVertical: "top" }]}
                placeholder="Descricao (opcional)"
                placeholderTextColor={Colors.textMuted}
                value={descricao}
                onChangeText={setDescricao}
                multiline
              />

              <Pressable onPress={handleCreate} style={({ pressed }) => [styles.modalBtn, { opacity: pressed ? 0.9 : 1 }]}>
                <Text style={styles.modalBtnText}>Criar Evento</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "rgba(15,23,42,0.7)",
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  addBtn: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
    borderRadius: 12, backgroundColor: "rgba(52,211,153,0.15)",
  },

  tabBar: {
    flexDirection: "row", backgroundColor: "rgba(15,23,42,0.85)",
    paddingHorizontal: 16, paddingVertical: 8, gap: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: Colors.border,
  },
  tabBtnActive: {
    backgroundColor: "rgba(52,211,153,0.12)",
    borderColor: "rgba(52,211,153,0.4)",
  },
  tabBtnText: {
    fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textMuted,
  },
  tabBtnTextActive: { color: Colors.primary },

  periodBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginBottom: 12, alignSelf: "flex-start",
    backgroundColor: "rgba(52,211,153,0.1)", borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(52,211,153,0.2)",
  },
  periodBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#34D399" },

  list: { padding: 20, gap: 20 },
  dateGroup: { gap: 10 },
  dateLabel: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text, textTransform: "capitalize" },
  eventCard: {
    flexDirection: "row", backgroundColor: Colors.surface, borderRadius: 14, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.border,
  },
  eventTypeBar: { width: 4 },
  eventContent: { flex: 1, padding: 14, gap: 6 },
  eventHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eventTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text, flex: 1 },
  eventTime: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  eventMeta: { flexDirection: "row" },
  eventTypeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  eventTypeText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  eventDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 8 },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", paddingHorizontal: 24 },
  modalContent: {
    backgroundColor: Colors.modalBg, borderRadius: 20, padding: 24, gap: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  modalInput: {
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text,
  },
  typeSelector: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  typeOption: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  typeOptionText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
  dateTimeRow: { flexDirection: "row", gap: 10 },
  modalBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  modalBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
