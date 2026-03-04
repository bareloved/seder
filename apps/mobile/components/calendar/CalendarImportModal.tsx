import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import type { GoogleCalendar } from "@seder/shared";
import { useCalendars, useCalendarImport } from "../../hooks/useCalendar";
import { useApi } from "../../providers/ApiProvider";
import { HEBREW_MONTHS } from "../income/MonthSelector";
import {
  colors,
  darkColors,
  spacing,
  borderRadius,
  typography,
  fonts,
  shadows,
  rtlRow,
  rtlRowReverse,
} from "../../lib/theme";
import { useDarkMode } from "../../providers/DarkModeProvider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalendarImportModalProps {
  visible: boolean;
  onClose: () => void;
  defaultYear: number;
  defaultMonth: number;
}

interface EventWithSelection {
  id: string;
  summary: string;
  start: string;
  end: string;
  calendarId: string;
  alreadyImported: boolean;
  selected: boolean;
  clientName: string;
  isWork: boolean;
}

// ---------------------------------------------------------------------------
// Classification rules engine — ported from web's classificationRules.ts
// ---------------------------------------------------------------------------

const TRANSLATIONS: Record<string, string[]> = {
  "הופעה": ["gig", "show", "concert", "performance"],
  "חתונה": ["wedding"],
  "חזרה": ["rehearsal"],
  "שיעור": ["lesson", "class", "teaching"],
  "פגישה": ["meeting"],
  "להקה": ["band"],
  "ישיבה": ["meeting", "session"],
  "פרויקט": ["project"],
  "רופא": ["doctor", "dr"],
  "שיניים": ["dentist", "dental"],
  "יום הולדת": ["birthday", "bday"],
  "חדר כושר": ["gym", "fitness"],
  "ספורט": ["sport", "sports", "workout"],
  "אמא": ["mom", "mother"],
  "אבא": ["dad", "father"],
  "משפחה": ["family"],
  "חופשה": ["vacation", "holiday"],
};

interface ClassificationRule {
  type: "work" | "personal";
  matchType: "title" | "calendar";
  keywords: string[];
}

const DEFAULT_RULES: ClassificationRule[] = [
  {
    type: "work",
    matchType: "title",
    keywords: ["הופעה", "חתונה", "חזרה", "שיעור", "להקה", "פגישה", "ישיבה", "פרויקט"],
  },
  {
    type: "personal",
    matchType: "title",
    keywords: ["רופא", "שיניים", "אמא", "אבא", "ספורט", "חדר כושר", "יום הולדת", "משפחה", "חופשה"],
  },
];

function getKeywordVariations(keyword: string): string[] {
  const variations = [keyword.toLowerCase()];
  const translations = TRANSLATIONS[keyword];
  if (translations) {
    for (const t of translations) variations.push(t.toLowerCase());
  }
  return variations;
}

function classifyEvent(
  summary: string,
  calendarId: string | undefined,
  rules: ClassificationRule[],
): { isWork: boolean; confidence: number } {
  const titleLower = summary.toLowerCase();

  for (const rule of rules) {
    if (rule.matchType === "title") {
      for (const keyword of rule.keywords) {
        const variations = getKeywordVariations(keyword);
        for (const v of variations) {
          if (titleLower.includes(v)) {
            return { isWork: rule.type === "work", confidence: 0.85 };
          }
        }
      }
    }
    if (rule.matchType === "calendar" && calendarId) {
      for (const keyword of rule.keywords) {
        const variations = getKeywordVariations(keyword);
        for (const v of variations) {
          if (calendarId.toLowerCase().includes(v)) {
            return { isWork: rule.type === "work", confidence: 0.9 };
          }
        }
      }
    }
  }

  // No rule matched — default to work with low confidence
  return { isWork: true, confidence: 0.5 };
}

// ---------------------------------------------------------------------------
// Step 1: Calendar & Month picker
// ---------------------------------------------------------------------------

function ImportStep1({
  calendars,
  selectedCalendarIds,
  setSelectedCalendarIds,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  onContinue,
  onClose,
  isFetching,
}: {
  calendars: GoogleCalendar[];
  selectedCalendarIds: string[];
  setSelectedCalendarIds: (ids: string[]) => void;
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  onContinue: () => void;
  onClose: () => void;
  isFetching: boolean;
}) {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;
  const [calendarPickerVisible, setCalendarPickerVisible] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const getCalendarLabel = () => {
    if (selectedCalendarIds.length === 0) return "יומן ראשי";
    if (selectedCalendarIds.length === 1) {
      const cal = calendars.find((c) => c.id === selectedCalendarIds[0]);
      return cal?.summary || "יומן אחד";
    }
    return `${selectedCalendarIds.length} יומנים`;
  };

  return (
    <View style={styles.stepContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={12}>
          <SymbolView name="xmark" tintColor={c.textMuted} size={18} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: c.text }]}>ייבוא מהיומן</Text>
          <SymbolView name="calendar.badge.plus" tintColor="#3b82f6" size={22} />
        </View>
      </View>

      <Text style={[styles.subtitle, { color: c.textMuted }]}>בחר חודש ויומנים לייבוא אירועים</Text>

      {/* Calendar selector */}
      <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>יומנים</Text>
      <TouchableOpacity
        style={[styles.selectorButton, { borderColor: c.border, backgroundColor: c.card }]}
        onPress={() => setCalendarPickerVisible(true)}
        activeOpacity={0.6}
      >
        <SymbolView name="slider.horizontal.3" tintColor={c.textMuted} size={16} />
        <View style={{ flex: 1 }} />
        <Text style={[styles.selectorText, { color: c.text }]}>{getCalendarLabel()}</Text>
      </TouchableOpacity>

      {/* Calendar picker modal */}
      <Modal
        visible={calendarPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setCalendarPickerVisible(false)}
        >
          <View style={[styles.calendarPickerCard, { backgroundColor: c.card }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.pickerTitle, { color: c.textMuted }]}>בחר יומנים</Text>
            <FlatList
              data={calendars}
              keyExtractor={(item) => item.id}
              renderItem={({ item: cal }) => {
                const isSelected = selectedCalendarIds.includes(cal.id);
                return (
                  <TouchableOpacity
                    style={styles.calendarOption}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (isSelected) {
                        setSelectedCalendarIds(selectedCalendarIds.filter((id) => id !== cal.id));
                      } else {
                        setSelectedCalendarIds([...selectedCalendarIds, cal.id]);
                      }
                    }}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.calendarDot, { backgroundColor: cal.backgroundColor }]} />
                    <Text style={[styles.calendarName, { color: c.text }]}>{cal.summary}</Text>
                    {cal.primary && <Text style={styles.primaryBadge}>ראשי</Text>}
                    <View style={{ flex: 1 }} />
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && (
                        <SymbolView name="checkmark" tintColor={colors.white} size={12} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity
              style={styles.calendarPickerDone}
              onPress={() => setCalendarPickerVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.calendarPickerDoneText}>
                אישור ({selectedCalendarIds.length})
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Month & Year selectors — month right, year left */}
      <View style={styles.monthYearRow}>
        <View style={{ width: 120 }}>
          <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>שנה</Text>
          <TouchableOpacity
            style={[styles.selectorButton, { borderColor: c.border, backgroundColor: c.card }]}
            onPress={() => setYearPickerVisible(true)}
            activeOpacity={0.6}
          >
            <SymbolView name="chevron.down" tintColor={c.textMuted} size={12} />
            <View style={{ flex: 1 }} />
            <Text style={[styles.selectorTextNum, { color: c.text }]}>{selectedYear}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>חודש</Text>
          <TouchableOpacity
            style={[styles.selectorButton, { borderColor: c.border, backgroundColor: c.card }]}
            onPress={() => setMonthPickerVisible(true)}
            activeOpacity={0.6}
          >
            <SymbolView name="chevron.down" tintColor={c.textMuted} size={12} />
            <View style={{ flex: 1 }} />
            <Text style={[styles.selectorText, { color: c.text }]}>{HEBREW_MONTHS[selectedMonth - 1]}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Month picker modal */}
      <Modal
        visible={monthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setMonthPickerVisible(false)}
        >
          <View style={[styles.pickerCard, { backgroundColor: c.card }]}>
            <FlatList
              data={HEBREW_MONTHS}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item, index }) => {
                const m = index + 1;
                const active = m === selectedMonth;
                return (
                  <TouchableOpacity
                    style={[styles.pickerOption, active && { backgroundColor: c.brandLight }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedMonth(m);
                      setMonthPickerVisible(false);
                    }}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.pickerOptionText, { color: c.text }, active && styles.pickerOptionTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Year picker modal */}
      <Modal
        visible={yearPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setYearPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setYearPickerVisible(false)}
        >
          <View style={[styles.pickerCard, { backgroundColor: c.card }]}>
            {years.map((y) => {
              const active = y === selectedYear;
              return (
                <TouchableOpacity
                  key={y}
                  style={[styles.pickerOption, active && { backgroundColor: c.brandLight }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedYear(y);
                    setYearPickerVisible(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.pickerOptionTextNum, { color: c.text }, active && styles.pickerOptionTextActive]}>
                    {y}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.continueButton, isFetching && { opacity: 0.6 }, isDark && { backgroundColor: "#c9d1d9" }]}
          onPress={onContinue}
          disabled={isFetching}
          activeOpacity={0.8}
        >
          {isFetching ? (
            <ActivityIndicator size="small" color={isDark ? colors.text : colors.white} />
          ) : (
            <>
              <Text style={[styles.continueText, isDark && { color: colors.text }]}>המשך</Text>
              <SymbolView name="calendar" tintColor={isDark ? colors.text : colors.white} size={16} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.cancelButton, { borderColor: c.border }]} onPress={onClose} activeOpacity={0.6}>
          <Text style={[styles.cancelText, { color: c.text }]}>ביטול</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Event preview with selection
// ---------------------------------------------------------------------------

function ImportStep2({
  events,
  onImport,
  onClose,
  isImporting,
}: {
  events: EventWithSelection[];
  onImport: (events: EventWithSelection[]) => void;
  onClose: () => void;
  isImporting: boolean;
}) {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;
  const [eventData, setEventData] = useState<EventWithSelection[]>(events);
  const [showPersonal, setShowPersonal] = useState(true);

  const toggleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEventData((prev) => prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e)));
  };

  const updateClientName = (id: string, clientName: string) => {
    setEventData((prev) => prev.map((e) => (e.id === id ? { ...e, clientName } : e)));
  };

  const selectAllWork = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEventData((prev) =>
      prev.map((e) => (e.isWork && !e.alreadyImported ? { ...e, selected: true } : e))
    );
  };

  const deselectAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEventData((prev) => prev.map((e) => ({ ...e, selected: false })));
  };

  const filtered = showPersonal ? eventData : eventData.filter((e) => e.isWork);
  const selectedCount = eventData.filter((e) => e.selected).length;
  const workCount = eventData.filter((e) => e.isWork && !e.alreadyImported).length;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
  };

  return (
    <View style={styles.stepContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={12}>
          <SymbolView name="xmark" tintColor={c.textMuted} size={18} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <Text style={[styles.headerTitle, { color: c.text }]}>תצוגה מקדימה - {events.length} אירועים</Text>
      </View>

      {/* Toolbar */}
      <View style={[styles.toolbar, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={selectAllWork} style={styles.toolbarBtn}>
          <Text style={[styles.toolbarText, { color: c.textMuted }]}>בחר הכל עבודה ({workCount})</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={deselectAll} style={styles.toolbarBtn}>
          <Text style={[styles.toolbarText, { color: c.textMuted }]}>נקה בחירה</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => setShowPersonal(!showPersonal)}
          style={styles.toolbarBtn}
        >
          <SymbolView
            name={showPersonal ? "eye" : "eye.slash"}
            tintColor={c.textMuted}
            size={12}
          />
          <Text style={[styles.toolbarText, { color: c.textMuted }]}>{showPersonal ? "הסתר אישי" : "הצג הכל"}</Text>
        </TouchableOpacity>
      </View>

      {/* Events list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.eventRow, item.selected && styles.eventRowSelected]}
            onPress={() => !item.alreadyImported && toggleSelect(item.id)}
            activeOpacity={0.7}
            disabled={item.alreadyImported}
          >
            {/* Top row: checkbox + info */}
            <View style={styles.eventTopRow}>
              <View
                style={[
                  styles.checkbox,
                  item.selected && styles.checkboxActive,
                  item.alreadyImported && { opacity: 0.3 },
                ]}
              >
                {item.selected && (
                  <SymbolView name="checkmark" tintColor={colors.white} size={12} />
                )}
              </View>

              <View style={styles.eventInfo}>
                <View style={styles.eventTitleRow}>
                  <Text style={[styles.eventTitle, { color: c.text }]} numberOfLines={1}>
                    {item.summary}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      item.alreadyImported
                        ? styles.badgeImported
                        : item.isWork
                          ? styles.badgeWork
                          : styles.badgePersonal,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        item.alreadyImported
                          ? styles.badgeTextImported
                          : item.isWork
                            ? styles.badgeTextWork
                            : styles.badgeTextPersonal,
                      ]}
                    >
                      {item.alreadyImported ? "יובא" : item.isWork ? "עבודה" : "אישי"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.eventDate, { color: c.textMuted }]}>
                  {formatDate(item.start)} • {formatTime(item.start)}
                </Text>
              </View>
            </View>

            {/* Client name input on its own line */}
            {item.selected && (
              <TextInput
                style={[styles.clientInput, { borderColor: c.border, color: c.text }]}
                placeholder="שם לקוח"
                placeholderTextColor={c.textLight}
                value={item.clientName}
                onChangeText={(text) => updateClientName(item.id, text)}
              />
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.eventsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyEvents}>
            <Text style={styles.emptyEventsText}>אין אירועים להצגה</Text>
          </View>
        }
      />

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (isImporting || selectedCount === 0) && { opacity: 0.5 },
          ]}
          onPress={() => onImport(eventData.filter((e) => e.selected))}
          disabled={isImporting || selectedCount === 0}
          activeOpacity={0.8}
        >
          {isImporting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.continueText}>
              ייבא {selectedCount} אירועים
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.cancelButton, { borderColor: c.border }]} onPress={onClose} activeOpacity={0.6}>
          <Text style={[styles.cancelText, { color: c.text }]}>ביטול</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main CalendarImportModal
// ---------------------------------------------------------------------------

export function CalendarImportModal({
  visible,
  onClose,
  defaultYear,
  defaultMonth,
}: CalendarImportModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [preparedEvents, setPreparedEvents] = useState<EventWithSelection[]>([]);

  const api = useApi();
  const { data: calendarData } = useCalendars();
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.settings.get(),
  });
  const importMutation = useCalendarImport();

  const calendars = calendarData?.data?.calendars ?? [];
  const connected = calendarData?.data?.connected ?? false;

  // Get classification rules from server settings, fall back to defaults
  const serverRules = (settingsData?.data?.calendarSettings as any)?.rules as ClassificationRule[] | undefined;
  const classificationRules = serverRules && serverRules.length > 0 ? serverRules : DEFAULT_RULES;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep(1);
      setSelectedYear(defaultYear);
      setSelectedMonth(defaultMonth);
      setPreparedEvents([]);
      // Default to primary calendar
      if (selectedCalendarIds.length === 0 && calendars.length > 0) {
        const primary = calendars.find((c) => c.primary);
        if (primary) setSelectedCalendarIds([primary.id]);
      }
    }
  }, [visible, defaultYear, defaultMonth]);

  // Update calendar selection when calendars load
  useEffect(() => {
    if (selectedCalendarIds.length === 0 && calendars.length > 0) {
      const primary = calendars.find((c) => c.primary);
      if (primary) setSelectedCalendarIds([primary.id]);
    }
  }, [calendars]);

  const handleContinue = useCallback(async () => {
    if (!connected) {
      Alert.alert("יומן לא מחובר", "חבר את חשבון הגוגל שלך דרך ההגדרות באתר");
      return;
    }

    setIsFetching(true);
    try {
      const result = await api.calendar.events(
        selectedYear,
        selectedMonth,
        selectedCalendarIds.length > 0 ? selectedCalendarIds : undefined
      );

      const rawEvents = result?.data ?? [];
      if (rawEvents.length === 0) {
        Alert.alert("אין אירועים", "לא נמצאו אירועים בחודש זה");
        return;
      }

      const prepared: EventWithSelection[] = rawEvents.map((e: any) => {
        const { isWork, confidence } = classifyEvent(e.summary, e.calendarId, classificationRules);
        return {
          id: e.id,
          summary: e.summary,
          start: typeof e.start === "string" ? e.start : new Date(e.start).toISOString(),
          end: typeof e.end === "string" ? e.end : new Date(e.end).toISOString(),
          calendarId: e.calendarId,
          alreadyImported: e.alreadyImported ?? false,
          isWork,
          // Auto-select work events with ≥70% confidence (matches web behavior)
          selected: !e.alreadyImported && isWork && confidence >= 0.7,
          clientName: "",
        };
      });

      setPreparedEvents(prepared);
      setStep(2);
    } catch (err) {
      console.error("Failed to fetch events:", err);
      Alert.alert("שגיאה", "לא ניתן לטעון אירועים");
    } finally {
      setIsFetching(false);
    }
  }, [api, connected, selectedYear, selectedMonth, selectedCalendarIds, classificationRules]);

  const handleImport = useCallback(
    async (selected: EventWithSelection[]) => {
      try {
        const result = await importMutation.mutateAsync({
          year: selectedYear,
          month: selectedMonth,
          calendarIds: selectedCalendarIds.length > 0 ? selectedCalendarIds : undefined,
        });

        const count = result?.data?.importedCount ?? 0;
        Alert.alert("הצלחה", `יובאו ${count} אירועים`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      } catch {
        Alert.alert("שגיאה", "לא ניתן לייבא אירועים");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [importMutation, selectedYear, selectedMonth, selectedCalendarIds, onClose]
  );

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: c.card }]}>
          {step === 1 ? (
            <ImportStep1
              calendars={calendars}
              selectedCalendarIds={selectedCalendarIds}
              setSelectedCalendarIds={setSelectedCalendarIds}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              onContinue={handleContinue}
              onClose={handleClose}
              isFetching={isFetching}
            />
          ) : (
            <ImportStep2
              events={preparedEvents}
              onImport={handleImport}
              onClose={handleClose}
              isImporting={importMutation.isPending}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    maxHeight: "80%",
    ...shadows.lg,
  },
  stepContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing["3xl"],
  },

  // Header
  header: {
    flexDirection: rtlRowReverse,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: rtlRowReverse,
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography["2xl"],
    fontFamily: fonts.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.lg,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 0,
  },

  // Field labels
  fieldLabel: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },

  // Selector buttons
  selectorButton: {
    flexDirection: rtlRowReverse,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    height: 52,
    backgroundColor: colors.card,
  },
  selectorText: {
    fontSize: typography.lg,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  selectorTextNum: {
    fontSize: typography.lg,
    fontFamily: fonts.numbersRegular,
    color: colors.text,
  },

  // Month/Year row
  monthYearRow: {
    flexDirection: rtlRowReverse,
    gap: spacing.md,
    marginTop: spacing.xs,
  },

  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },

  // Picker card
  pickerCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    width: 280,
    maxHeight: 400,
    padding: spacing.lg,
    ...shadows.lg,
  },
  pickerTitle: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  pickerOption: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.md,
  },
  pickerOptionActive: {
    backgroundColor: colors.brandLight,
  },
  pickerOptionText: {
    fontSize: typography.lg,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  pickerOptionTextNum: {
    fontSize: typography.lg,
    fontFamily: fonts.numbersMedium,
    color: colors.text,
  },
  pickerOptionTextActive: {
    color: colors.brand,
    fontFamily: fonts.bold,
  },

  // Calendar picker card (larger, scrollable)
  calendarPickerCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    width: 300,
    maxHeight: 480,
    padding: spacing.lg,
    ...shadows.lg,
  },
  calendarPickerDone: {
    backgroundColor: colors.brand,
    borderRadius: borderRadius.lg,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },
  calendarPickerDoneText: {
    color: colors.white,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
  },

  // Calendar picker options
  calendarOption: {
    flexDirection: rtlRowReverse,
    alignItems: "center",
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.sm,
  },
  calendarDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  calendarName: {
    fontSize: typography.lg,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  primaryBadge: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.md,
  },

  // Checkbox
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },

  // Actions
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  continueButton: {
    backgroundColor: colors.text,
    borderRadius: borderRadius.xl,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: rtlRowReverse,
    gap: spacing.sm,
  },
  continueText: {
    color: colors.white,
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: colors.text,
    fontSize: typography.lg,
    fontFamily: fonts.medium,
  },

  // Toolbar (step 2)
  toolbar: {
    flexDirection: rtlRowReverse,
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  toolbarBtn: {
    flexDirection: rtlRowReverse,
    alignItems: "center",
    gap: 4,
  },
  toolbarText: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },

  // Event row (step 2)
  eventRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  eventRowSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.06)",
  },
  eventTopRow: {
    flexDirection: rtlRowReverse,
    alignItems: "center",
    gap: spacing.sm,
  },
  eventInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  eventTitleRow: {
    flexDirection: rtlRowReverse,
    alignItems: "center",
    gap: spacing.sm,
  },
  eventTitle: {
    fontSize: typography.lg,
    fontFamily: fonts.medium,
    color: colors.text,
    flexShrink: 1,
  },
  eventDate: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  eventsList: {
    paddingBottom: spacing.sm,
  },
  emptyEvents: {
    paddingVertical: spacing["3xl"],
    alignItems: "center",
  },
  emptyEventsText: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },

  // Badges
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.md,
  },
  badgeWork: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  badgePersonal: {
    backgroundColor: "rgba(244, 63, 94, 0.12)",
  },
  badgeImported: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
  badgeText: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
  },
  badgeTextWork: {
    color: "#059669",
  },
  badgeTextPersonal: {
    color: "#e11d48",
  },
  badgeTextImported: {
    color: "#2563eb",
  },

  // Client input
  clientInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    fontSize: typography.lg,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlign: "right",
  },
});
