// CalendarScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Alert,
  ViewStyle,
  TextStyle,
  RefreshControl,
} from "react-native";
import {
  Layout,
  Text,
  Button,
  Card,
  Icon,
  Calendar as UIKittenCalendar,
  Modal,
  Input,
  Select,
  SelectItem,
  IndexPath,
  Divider,
  StyleService,
  useStyleSheet,
  Spinner,
  Datepicker,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { FloatingAction } from "react-native-floating-action";
import { useFocusEffect } from "@react-navigation/native";

interface Event {
  $id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: "promotion" | "order" | "reminder" | "other";
  status: "active" | "completed" | "cancelled";
  relatedId?: string; // ID của đơn hàng hoặc khuyến mãi liên quan
}
// Render thẻ đánh dấu ngày
interface DayStyle {
  container: ViewStyle;
  text: TextStyle;
}

interface MarkedDateInfo {
  dateString: string;
  markedDates: {
    [key: string]: {
      type: string;
      color: string;
    }[];
  };
}
const CalendarScreen = ({}) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const { getAllItem, createItem, updateItem, deleteItem } = useDatabases();

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState<Event[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  // State cho form thêm sự kiện
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStart, setEventStart] = useState(new Date());
  const [eventEnd, setEventEnd] = useState(new Date());
  const [eventTypeIndex, setEventTypeIndex] = useState(new IndexPath(0));
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Lấy danh sách sự kiện
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const eventsData = await getAllItem(COLLECTION_IDS.events);
      setEvents(eventsData);
      updateEventsForSelectedDate(selectedDate, eventsData);
      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu sự kiện:", error);
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const today = new Date();
    setSelectedDate(today);
    updateEventsForSelectedDate(today);
  }, []);
  // Cập nhật danh sách sự kiện cho ngày đã chọn
  const updateEventsForSelectedDate = (
    date: Date,
    eventsList: Event[] = events
  ) => {
    if (!date || !eventsList || eventsList.length === 0) {
      setEventsForSelectedDate([]);
      return;
    }

    try {
      // Chuẩn hóa ngày để tránh vấn đề múi giờ
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);
      const dateString = normalizedDate.toISOString().split("T")[0];

      console.log("Selected date:", dateString);

      const filtered = eventsList.filter((event) => {
        if (!event.startDate || !event.endDate) return false;

        try {
          // Chuẩn hóa ngày bắt đầu và kết thúc
          const eventStartObj = new Date(event.startDate);
          eventStartObj.setHours(0, 0, 0, 0);

          const eventEndObj = new Date(event.endDate);
          eventEndObj.setHours(0, 0, 0, 0);

          const eventStart = eventStartObj.toISOString().split("T")[0];
          const eventEnd = eventEndObj.toISOString().split("T")[0];

          console.log(
            `Event ${event.title}: Start=${eventStart}, End=${eventEnd}, Match=${dateString >= eventStart && dateString <= eventEnd}`
          );

          return dateString >= eventStart && dateString <= eventEnd;
        } catch (error) {
          console.error("Lỗi khi xử lý ngày tháng của sự kiện:", error);
          return false;
        }
      });

      console.log("Filtered events:", filtered.length);
      setEventsForSelectedDate(filtered);
    } catch (error) {
      console.error("Lỗi khi cập nhật sự kiện cho ngày:", error);
      setEventsForSelectedDate([]);
    }
  };
  // Sửa hàm handleDateSelect
  const handleDateSelect = (date: Date) => {
    if (!date) return;

    setSelectedDate(date);
    updateEventsForSelectedDate(date);
  };

  // Xử lý khi thêm/sửa sự kiện
  const handleSaveEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert("", t("title_required"));
      return;
    }

    try {
      const eventData = {
        title: eventTitle.trim(),
        description: eventDescription.trim() || undefined,
        startDate: eventStart.toISOString(),
        endDate: eventEnd.toISOString(),
        type: ["promotion", "order", "reminder", "other"][eventTypeIndex.row],
        status: "active",
      };

      if (editingEvent) {
        // Cập nhật sự kiện
        await updateItem(COLLECTION_IDS.events, editingEvent.$id, eventData);
        Alert.alert("", t("event_updated_successfully"));
      } else {
        // Tạo sự kiện mới
        await createItem(COLLECTION_IDS.events, eventData);
        Alert.alert("", t("event_created_successfully"));
      }

      // Reset form và fetch lại dữ liệu
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error("Lỗi khi lưu sự kiện:", error);
      Alert.alert("", t("error_saving_event"));
    }
  };

  // Reset form
  const resetForm = () => {
    setEditingEvent(null);
    setEventTitle("");
    setEventDescription("");
    setEventStart(new Date());
    setEventEnd(new Date());
    setEventTypeIndex(new IndexPath(0));
    setModalVisible(false);
  };

  // Xử lý khi xóa sự kiện
  const handleDeleteEvent = async () => {
    if (!editingEvent) return;

    try {
      await deleteItem(COLLECTION_IDS.events, editingEvent.$id);
      Alert.alert("", t("event_deleted_successfully"));
      fetchEvents();
      resetForm();
      setDeleteModalVisible(false);
    } catch (error) {
      console.error("Lỗi khi xóa sự kiện:", error);
      Alert.alert("", t("error_deleting_event"));
    }
  };

  // Hiển thị form sửa sự kiện
  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDescription(event.description || "");
    setEventStart(new Date(event.startDate));
    setEventEnd(new Date(event.endDate));

    const typeIndex = ["promotion", "order", "reminder", "other"].indexOf(
      event.type
    );
    setEventTypeIndex(new IndexPath(typeIndex >= 0 ? typeIndex : 0));

    setModalVisible(true);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchEvents();
      return () => {};
    }, [fetchEvents])
  );

  // Làm mới dữ liệu
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents().then(() => setRefreshing(false));
  }, [fetchEvents]);

  // Hiển thị màu cho từng loại sự kiện
  const getEventColor = (type: string) => {
    switch (type) {
      case "promotion":
        return "#7E57C2"; // Tím
      case "order":
        return "#4CAF50"; // Xanh lá
      case "reminder":
        return "#FFA726"; // Cam
      default:
        return "#42A5F5"; // Xanh dương
    }
  };

  // Hiển thị icon cho từng loại sự kiện
  const getEventIcon = (type: string) => {
    switch (type) {
      case "promotion":
        return "gift-outline";
      case "order":
        return "shopping-bag-outline";
      case "reminder":
        return "bell-outline";
      default:
        return "calendar-outline";
    }
  };

  // Tạo dữ liệu đánh dấu ngày cho calendar
  interface MarkedDate {
    type: string;
    color: string;
  }

  const getDatesMarked = () => {
    const markedDates: { [key: string]: MarkedDate[] } = {};

    if (!events || events.length === 0) return markedDates;

    events.forEach((event) => {
      if (!event.startDate || !event.endDate) return;

      try {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);

        // Kiểm tra tính hợp lệ của ngày
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

        // Lặp qua từng ngày từ start đến end
        for (
          let date = new Date(start);
          date <= end;
          date.setDate(date.getDate() + 1)
        ) {
          try {
            const dateString = date.toISOString().split("T")[0];

            if (!markedDates[dateString]) {
              markedDates[dateString] = [];
            }

            markedDates[dateString].push({
              type: event.type,
              color: getEventColor(event.type),
            });
          } catch (error) {
            console.error("Lỗi khi đánh dấu ngày:", error);
          }
        }
      } catch (error) {
        console.error("Lỗi khi xử lý sự kiện:", error);
      }
    });

    return markedDates;
  };

  const renderDayElement = (date: Date | undefined, style: DayStyle) => {
    console.log("Render day:", date, style);
    // Kiểm tra date có tồn tại và phải là đối tượng Date
    if (!date || typeof date !== "object" || !(date instanceof Date)) {
      return (
        <View style={style.container}>
          <Text style={style.text}></Text>
        </View>
      );
    }

    try {
      // Nếu qua được các kiểm tra, tiếp tục render như bình thường
      const dateString = date.toISOString().split("T")[0];
      const markedDates = getDatesMarked();
      const isMarked =
        markedDates[dateString] && markedDates[dateString].length > 0;

      return (
        <View style={[style.container, isMarked && { position: "relative" }]}>
          <Text style={style.text}>{date.getDate()}</Text>
          {isMarked && (
            <View
              style={[
                styles.dateMark as ViewStyle,
                { backgroundColor: markedDates[dateString][0].color },
              ]}
            />
          )}
        </View>
      );
    } catch (error) {
      console.error("Lỗi khi render ngày:", error);
      return (
        <View style={style.container}>
          <Text style={style.text}>{date?.getDate?.()}</Text>
        </View>
      );
    }
  };

  // Floating action buttons
  const actions = [
    {
      text: t("add_event"),
      icon: require("../../assets/icons/plus-outline.png"),
      name: "add_event",
      position: 1,
    },
  ];

  return (
    <Layout style={styles.container as ViewStyle}>
      <View style={styles.calendarContainer as ViewStyle}>
        <Datepicker
          date={selectedDate}
          onSelect={handleDateSelect}
          min={new Date(2020, 0, 1)}
          max={new Date(2030, 11, 31)}
          size="large"
        />
      </View>
      <View style={styles.eventListHeader as ViewStyle}>
        <Text category="h6" style={styles.eventListTitle as TextStyle}>
          {t("events_for_date")}: {selectedDate.toLocaleDateString()}
        </Text>
      </View>

      <ScrollView
        style={styles.eventList as ViewStyle}
        contentContainerStyle={styles.eventListContent as ViewStyle}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer as ViewStyle}>
            <Spinner size="medium" />
            <Text appearance="hint" style={{ marginTop: 16 }}>
              {t("loading_events")}
            </Text>
          </View>
        ) : eventsForSelectedDate.length > 0 ? (
          eventsForSelectedDate.map((event) => (
            <Card
              key={event.$id}
              style={[
                styles.eventCard as ViewStyle,
                { borderLeftColor: getEventColor(event.type) },
              ]}
              onPress={() => handleEditEvent(event)}
            >
              <View style={styles.eventHeader as ViewStyle}>
                <View style={styles.eventTitleContainer as ViewStyle}>
                  <Icon
                    name={getEventIcon(event.type)}
                    fill={getEventColor(event.type)}
                    style={styles.eventIcon}
                  />
                  <Text category="s1" style={styles.eventTitle as TextStyle}>
                    {event.title}
                  </Text>
                </View>
                <View
                  style={[
                    styles.eventTypeBadge as ViewStyle,
                    { backgroundColor: `${getEventColor(event.type)}20` },
                  ]}
                >
                  <Text
                    category="c2"
                    style={{ color: getEventColor(event.type) }}
                  >
                    {t(event.type)}
                  </Text>
                </View>
              </View>
              {event.description && (
                <Text
                  category="p2"
                  style={styles.eventDescription as TextStyle}
                >
                  {event.description}
                </Text>
              )}
              <View style={styles.eventDateContainer as ViewStyle}>
                <Icon
                  name="calendar-outline"
                  fill="#8F9BB3"
                  style={styles.eventDateIcon}
                />
                <Text category="c1" appearance="hint">
                  {new Date(event.startDate).toLocaleDateString()} -{" "}
                  {new Date(event.endDate).toLocaleDateString()}
                </Text>
              </View>
            </Card>
          ))
        ) : (
          <View style={styles.emptyContainer as ViewStyle}>
            <Icon
              name="calendar-outline"
              fill="#DDE1E6"
              style={styles.emptyIcon}
            />
            <Text appearance="hint" style={styles.emptyText as TextStyle}>
              {t("no_events_for_date")}
            </Text>
            <Button
              size="small"
              appearance="ghost"
              status="primary"
              style={{ marginTop: 16 }}
              onPress={() => setModalVisible(true)}
            >
              {t("add_event")}
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Modal thêm/sửa sự kiện */}
      <Modal
        visible={modalVisible}
        backdropStyle={styles.backdrop as ViewStyle}
        onBackdropPress={() => !loading && resetForm()}
        style={{ width: "90%" }}
      >
        <Card disabled>
          <ScrollView style={{ maxHeight: 500 }}>
            <Text category="h5" style={styles.modalTitle as TextStyle}>
              {editingEvent ? t("edit_event") : t("create_event")}
            </Text>

            <Input
              label={t("event_title")}
              placeholder={t("enter_event_title")}
              value={eventTitle}
              onChangeText={setEventTitle}
              style={styles.input as TextStyle}
            />

            <Select
              label={t("event_type")}
              selectedIndex={eventTypeIndex}
              onSelect={(index) => setEventTypeIndex(index as IndexPath)}
              value={t(
                ["promotion", "order", "reminder", "other"][eventTypeIndex.row]
              )}
              style={styles.input as ViewStyle}
            >
              <SelectItem title={t("promotion")} />
              <SelectItem title={t("order")} />
              <SelectItem title={t("reminder")} />
              <SelectItem title={t("other")} />
            </Select>

            <Text category="label" style={styles.dateLabel as TextStyle}>
              {t("event_period")}
            </Text>
            <View style={styles.dateContainer as ViewStyle}>
              <UIKittenCalendar
                date={eventStart}
                onSelect={setEventStart}
                style={styles.dateInput as ViewStyle}
                min={new Date()}
              />
              <Text style={{ alignSelf: "center", marginVertical: 8 }}>
                {t("to")}
              </Text>
              <UIKittenCalendar
                date={eventEnd}
                onSelect={setEventEnd}
                style={styles.dateInput as ViewStyle}
                min={eventStart}
              />
            </View>

            <Input
              label={t("description")}
              placeholder={t("enter_description")}
              value={eventDescription}
              onChangeText={setEventDescription}
              multiline
              textStyle={{ minHeight: 64 }}
              style={styles.input as TextStyle}
            />

            <View style={styles.buttonContainer as ViewStyle}>
              {editingEvent && (
                <Button
                  status="danger"
                  appearance="outline"
                  style={styles.deleteButton as ViewStyle}
                  onPress={() => setDeleteModalVisible(true)}
                >
                  {t("delete")}
                </Button>
              )}

              <Button
                appearance="outline"
                status="basic"
                onPress={resetForm}
                style={styles.button as ViewStyle}
              >
                {t("cancel")}
              </Button>

              <Button
                status="primary"
                onPress={handleSaveEvent}
                style={styles.button as ViewStyle}
              >
                {editingEvent ? t("update") : t("create")}
              </Button>
            </View>
          </ScrollView>
        </Card>
      </Modal>

      {/* Modal xác nhận xóa */}
      <Modal
        visible={deleteModalVisible}
        backdropStyle={styles.backdrop as ViewStyle}
        onBackdropPress={() => setDeleteModalVisible(false)}
      >
        <Card>
          <Text category="h6" style={styles.deleteTitle as TextStyle}>
            {t("confirm_delete")}
          </Text>
          <Text style={styles.deleteMessage as TextStyle}>
            {t("delete_event_confirmation")}
          </Text>
          <View style={styles.deleteButtons as ViewStyle}>
            <Button
              appearance="outline"
              status="basic"
              onPress={() => setDeleteModalVisible(false)}
              style={styles.deleteButtonHalf as ViewStyle}
            >
              {t("cancel")}
            </Button>
            <Button
              status="danger"
              onPress={handleDeleteEvent}
              style={styles.deleteButtonHalf as ViewStyle}
            >
              {t("delete")}
            </Button>
          </View>
        </Card>
      </Modal>

      <FloatingAction
        actions={actions}
        color="#4169E1"
        onPressItem={() => setModalVisible(true)}
      />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-2",
  },
  calendarContainer: {
    backgroundColor: "background-basic-color-1",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "border-basic-color-3",
  },
  eventListHeader: {
    padding: 16,
    backgroundColor: "background-basic-color-1",
  },
  eventListTitle: {
    fontWeight: "600",
  },
  eventList: {
    flex: 1,
  },
  eventListContent: {
    padding: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  eventCard: {
    marginBottom: 16,
    borderRadius: 12,
    borderLeftWidth: 5,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  eventTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  eventIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  eventTitle: {
    fontWeight: "bold",
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventDescription: {
    marginBottom: 8,
  },
  eventDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  eventDateIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: "center",
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  dateLabel: {
    marginBottom: 8,
  },
  dateContainer: {
    marginBottom: 16,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "border-basic-color-3",
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  button: {
    marginLeft: 8,
  },
  deleteButton: {
    marginRight: "auto",
  },
  deleteTitle: {
    textAlign: "center",
    marginBottom: 16,
  },
  deleteMessage: {
    marginBottom: 16,
    textAlign: "center",
  },
  deleteButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  deleteButtonHalf: {
    flex: 1,
    margin: 4,
  },
  dateMark: {
    position: "absolute",
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    alignSelf: "center",
  },
});

export default CalendarScreen;
