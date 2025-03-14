import React, { useEffect, useState, useCallback, memo } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  Text,
  Button,
  StyleService,
  useStyleSheet,
  Layout,
  Icon,
  Card,
  useTheme,
  Input,
  Spinner,
  Divider,
  Modal,
} from "@ui-kitten/components";
import { FloatingAction } from "react-native-floating-action";
import { CreatePropsCard } from "../components/common";
import { useRecoilState, useRecoilValue, useRecoilCallback } from "recoil";
import { allTablesAtom, tableAtomFamily, tableIdsAtom } from "../states";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { LinearGradient } from "expo-linear-gradient";
import { Query } from "appwrite";
import * as RootNavigation from "../navigator/RootNavigation";

interface CardProps {
  visible: boolean;
  method: "create" | "update" | "delete" | "cancel";
  itemInfo: {
    $id?: string;
    name: string;
  };
}

interface FunctionCardProps {
  cardProps: CardProps;
  setCardPropsCallback: (props: CardProps) => void;
}

interface TableCardProps {
  tableId: string;
  setCardPropsCallback: (props: CardProps) => void;
  index: number;
}

interface Table {
  $id: string;
  name: string;
}

interface Order {
  $id: string;
  $createdAt: string;
  table: string;
  status: string;
  total: number;
}

interface TableCardDetailModalProps {
  visible: boolean;
  table: Table;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  refreshTables: () => void;
}

// Mã màu cho từng loại bàn (sử dụng index để tạo sự đa dạng)
const TABLE_COLORS = [
  ["#9C8BE0", "#7E57C2"] as const,
  ["#90CAF9", "#42A5F5"] as const,
  ["#A5D6A7", "#66BB6A"] as const,
  ["#FFCC80", "#FFA726"] as const,
  ["#F48FB1", "#EC407A"] as const,
  ["#81D4FA", "#29B6F6"] as const,
] as const;

const DEFAULT_CARD_PROPS: CardProps = {
  visible: false,
  method: "create",
  itemInfo: {
    $id: "",
    name: "",
  },
};

// Cập nhật TableCardDetailModal component
const TableCardDetailModal: React.FC<TableCardDetailModalProps> = ({
  visible,
  table,
  onClose,
  onEdit,
  refreshTables,
  onDelete,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyleSheet(styleSheet);
  const { getAllItem, updateItem } = useDatabases();
  const [tableOrders, setTableOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(table.name);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsEditing(false);
      setEditingName(table.name);
    }
  }, [visible, table]);

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };
  useEffect(() => {
    if (visible) {
      setIsEditing(false);
      setEditingName(table.name);
    }
  }, [visible, table]);
  const handleDeleteTable = () => {
    Alert.alert(
      t("confirm_delete"),
      t("delete_table_confirmation").replace("{name}", table.name),
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => {
            onClose(); // Đóng modal trước
            onDelete(); // Gọi hàm xóa được truyền từ bên ngoài
          },
        },
      ]
    );
  };
  const handleSaveEdit = () => {
    if (!editingName.trim()) {
      Alert.alert("", t("table_name_required"));
      return;
    }

    // Gọi hàm cập nhật bàn
    updateItem(COLLECTION_IDS.tables, table.$id, {
      name: editingName.trim(),
    })
      .then(() => {
        setIsEditing(false);
        // Làm mới dữ liệu TOÀN BỘ ứng dụng, không chỉ trong modal
        refreshTables(); // Đảm bảo refreshTables được truyền vào modal hoặc xây dựng lại tại đây
        Alert.alert("", t("update_table_success"));
      })
      .catch((error: any) => {
        console.error("Lỗi khi cập nhật bàn:", error);
        Alert.alert(t("error"), t("update_table_error"));
      });
  };

  // Lấy danh sách đơn hàng của bàn khi modal hiển thị
  useEffect(() => {
    if (visible && table) {
      loadTableOrders();
    }
  }, [visible, table]);

  const loadTableOrders = async () => {
    setLoading(true);
    try {
      // Lấy thời gian đầu ngày hôm nay
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Truy vấn các đơn hàng của bàn này
      const orders = await getAllItem(COLLECTION_IDS.orders, [
        Query.equal("table", table.name),
        Query.greaterThanEqual("$createdAt", today.toISOString()),
      ]);
      console.log("Orders loaded:", orders.length);
      setTableOrders(orders);
    } catch (error) {
      console.error("Lỗi khi tải đơn hàng bàn:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      backdropStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onBackdropPress={() => {
        setMenuVisible(false);
        onClose();
      }}
    >
      <View
        style={{
          width: width * 0.9,
          borderRadius: 8,
          backgroundColor: "white",
          overflow: "hidden",
        }}
      >
        {/* Header với nút "..." */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 12,
            backgroundColor: theme["color-primary-500"],
          }}
        >
          <Text category="h6" style={{ color: "white" }}>
            {isEditing ? t("edit_table") : table.name}
          </Text>

          {!isEditing && (
            <TouchableOpacity onPress={toggleMenu}>
              <Icon
                name="more-vertical"
                fill="white"
                style={{ width: 24, height: 24 }}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdown menu */}
        {menuVisible && !isEditing && (
          <View
            style={{
              position: "absolute",
              top: 55,
              right: 12,
              backgroundColor: "white",
              borderRadius: 4,
              borderWidth: 1,
              borderColor: theme["color-basic-300"],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.23,
              shadowRadius: 2.62,
              elevation: 4,
              zIndex: 999,
            }}
          >
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme["color-basic-300"],
              }}
              onPress={() => {
                setMenuVisible(false);
                setIsEditing(true);
              }}
            >
              <Icon
                name="edit-outline"
                fill={theme["color-primary-500"]}
                style={{ width: 20, height: 20, marginRight: 8 }}
              />
              <Text>{t("edit")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
              }}
              onPress={() => {
                setMenuVisible(false);
                handleDeleteTable();
              }}
            >
              <Icon
                name="trash-2-outline"
                fill={theme["color-danger-500"]}
                style={{ width: 20, height: 20, marginRight: 8 }}
              />
              <Text status="danger">{t("delete")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Phần nội dung có thể cuộn */}
        <View style={{ maxHeight: "80%" }}>
          <Card disabled style={{ borderRadius: 0 }}>
            {isEditing ? (
              // Form sửa tên bàn
              <View style={{ marginBottom: 16 }}>
                <Input
                  label={t("table_name")}
                  placeholder={t("enter_table_name")}
                  value={editingName}
                  onChangeText={setEditingName}
                  autoFocus
                />
              </View>
            ) : (
              // Hiển thị tên bàn (có thể bỏ đi vì đã hiển thị ở header)
              <View style={{ height: 8 }}></View>
            )}
            <Text category="s1" appearance="hint">
              {t("today_table_orders")} ({new Date().toLocaleDateString()})
            </Text>

            {/* Chỉ hiển thị danh sách đơn hàng khi không đang sửa */}
            {!isEditing && (
              <>
                {loading ? (
                  <View style={styles.loadingContainer as ViewStyle}>
                    <Spinner size="small" />
                  </View>
                ) : tableOrders.length > 0 ? (
                  <ScrollView style={styles.ordersList as ViewStyle}>
                    {tableOrders.map((order) => (
                      <Card
                        key={order.$id}
                        style={styles.orderCard as ViewStyle}
                        onPress={() => {
                          onClose();
                          RootNavigation.navigate("ReceiptScreen", {
                            receiptData: order,
                          });
                        }}
                      >
                        <View style={styles.orderCardContent as ViewStyle}>
                          <View>
                            <Text category="s1">
                              {t("order_id")}: {order.$id.slice(-4)}
                            </Text>
                            <Text category="p2" appearance="hint">
                              {new Date(order.$createdAt).toLocaleString()}
                            </Text>
                          </View>
                          <View>
                            <Text
                              category="s2"
                              status={
                                order.status === "unpaid" ? "danger" : "success"
                              }
                            >
                              {t(order.status)}
                            </Text>
                            <Text category="s1">
                              {Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(order.total)}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyOrders as ViewStyle}>
                    <Icon
                      name="calendar-outline"
                      fill={theme["color-basic-400"]}
                      style={{ width: 40, height: 40 }}
                    />
                    <Text
                      category="p1"
                      appearance="hint"
                      style={{ marginTop: 8, textAlign: "center" }}
                    >
                      {t("no_orders_for_table")}
                    </Text>
                  </View>
                )}
              </>
            )}
          </Card>
        </View>

        <Divider />

        {/* Nút thao tác - chỉ hiển thị khi đang sửa */}
        {isEditing && (
          <View
            style={{
              flexDirection: "row",
              padding: 16,
              backgroundColor: "white",
            }}
          >
            <Button
              appearance="outline"
              status="basic"
              style={{ flex: 1, marginRight: 8 }}
              onPress={() => {
                setIsEditing(false);
                setEditingName(table.name); // Reset về giá trị ban đầu
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              status="primary"
              style={{ flex: 1, marginLeft: 8 }}
              onPress={handleSaveEdit}
            >
              {t("save")}
            </Button>
          </View>
        )}
      </View>
    </Modal>
  );
};

const FunctionCard: React.FC<FunctionCardProps> = ({
  cardProps,
  setCardPropsCallback,
}): React.ReactElement => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { getAllItem } = useDatabases();

  const tableScreenActions = [
    {
      text: t("create_table"),
      icon: require("../../assets/icons/plus-outline.png"),
      name: "CreateTableScreen",
      position: 1,
    },
  ];

  const refreshTables = useRecoilCallback(
    ({ set }) =>
      async () => {
        setCardPropsCallback(DEFAULT_CARD_PROPS);
        const tableData = await getAllItem(COLLECTION_IDS.tables);
        set(allTablesAtom, tableData);
        const ids = [];
        for (const table of tableData) {
          ids.push(table.$id);
          set(tableAtomFamily(table.$id), table);
        }
        set(tableIdsAtom, ids);
      },
    []
  );

  return cardProps.visible ? (
    <CreatePropsCard
      collection={COLLECTION_IDS.tables}
      method={cardProps.method}
      onFinished={() => refreshTables()}
      itemInfo={cardProps.itemInfo}
    />
  ) : (
    <FloatingAction
      actions={tableScreenActions}
      color="#4169E1"
      buttonSize={56}
      iconWidth={24}
      iconHeight={24}
      distanceToEdge={16}
      showBackground={false}
      onPressItem={(screenName) => {
        console.log(`selected button:: ${screenName}`);
        setCardPropsCallback({
          method: DEFAULT_CARD_PROPS.method,
          visible: true,
          itemInfo: DEFAULT_CARD_PROPS.itemInfo,
        });
      }}
    />
  );
};

const TableCard = ({
  tableId,
  setCardPropsCallback,
  index,
}: TableCardProps): React.ReactElement => {
  const [table] = useRecoilState(tableAtomFamily(tableId));
  const styles = useStyleSheet(styleSheet);

  const { t } = useTranslation();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const { deleteItem, getAllItem } = useDatabases();
  // Tạo màu dựa trên index của bàn
  const colorIndex = index % TABLE_COLORS.length;
  const tableColors = TABLE_COLORS[colorIndex];

  const handleTablePress = () => {
    setDetailModalVisible(true);
  };
  const refreshTables = useRecoilCallback(
    ({ set }) =>
      async () => {
        const tableData = await getAllItem(COLLECTION_IDS.tables);
        set(allTablesAtom, tableData);
        const ids = [];
        for (const table of tableData) {
          ids.push(table.$id);
          set(tableAtomFamily(table.$id), table);
        }
        set(tableIdsAtom, ids);
      },
    [getAllItem]
  );
  const handleEditTable = () => {
    refreshTables();
  };

  // Trong TableCard, sửa lại hàm handleDeleteTable:
  const handleDeleteTable = () => {
    setDetailModalVisible(false);

    // Xóa bàn trực tiếp
    deleteItem(COLLECTION_IDS.tables, table.$id)
      .then(() => {
        // Sau khi xóa thành công, cập nhật lại danh sách
        refreshTables();
        // Có thể hiển thị thông báo thành công
        Alert.alert("", t("delete_table_success"));
      })
      .catch((error) => {
        console.error("Lỗi khi xóa bàn:", error);
        Alert.alert(t("error"), t("delete_table_error"));
      });
  };

  return (
    <>
      <Card
        style={[styles.cardWrapper, styles.tableCard] as ViewStyle[]}
        onPress={handleTablePress}
      >
        <View style={styles.tableCardContent as ViewStyle}>
          {/* Top color band with icon */}
          <LinearGradient
            colors={tableColors}
            style={styles.tableColorBand as ViewStyle}
          >
            <View style={styles.tableIconContainer as ViewStyle}>
              <Icon
                style={styles.tableIcon as ViewStyle}
                fill="white"
                name="monitor-outline"
              />
            </View>
          </LinearGradient>

          {/* Table name area */}
          <View style={styles.tableNameArea as ViewStyle}>
            <Text
              category="h6"
              style={styles.tableName as TextStyle}
              numberOfLines={1}
            >
              {table.name}
            </Text>
          </View>
        </View>
      </Card>

      {/* Modal chi tiết bàn */}
      <TableCardDetailModal
        visible={detailModalVisible}
        table={table}
        onClose={() => setDetailModalVisible(false)}
        onEdit={handleEditTable}
        onDelete={handleDeleteTable}
        refreshTables={refreshTables}
      />
    </>
  );
};

const MemoizedTableCard = memo(
  TableCard,
  (prev, next) => prev.tableId === next.tableId
);

const ManageTableScreen = () => {
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const [cardProps, setCardProps] = useState(DEFAULT_CARD_PROPS);
  const tableIds = useRecoilValue(tableIdsAtom);
  const [searchText, setSearchText] = useState("");
  const [filteredTableIds, setFilteredTableIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Format table counts
  const tables = useRecoilValue(allTablesAtom);
  const totalTables = tables.length;

  // Filter tables based on search text
  useEffect(() => {
    if (!tableIds.length) {
      setFilteredTableIds([]);
      return;
    }

    const filterTables = () => {
      if (!searchText) return tableIds;

      return tableIds.filter((id) => {
        const table = tables.find((t) => t.$id === id);
        if (!table) return false;

        return table.name.toLowerCase().includes(searchText.toLowerCase());
      });
    };

    setFilteredTableIds(filterTables());
  }, [tableIds, searchText, tables]);

  const setCardPropsCallback = useCallback((props: CardProps) => {
    setCardProps({
      method: props.method,
      visible: props.visible,
      itemInfo: props.itemInfo,
    });
  }, []);

  return (
    <Layout style={styles.container as ViewStyle}>
      {/* Header với thông tin tổng quan */}
      <LinearGradient
        colors={["#4169E1", "#1E40AF"]}
        style={styles.header as ViewStyle}
      >
        <View style={styles.statsContainer as ViewStyle}>
          <Text category="h1" style={styles.statValue as TextStyle}>
            {totalTables}
          </Text>
          <Text style={styles.statLabel as TextStyle}>{t("total_tables")}</Text>
        </View>
      </LinearGradient>

      {/* Search bar */}
      <View style={styles.searchContainer as ViewStyle}>
        <Input
          placeholder={t("search_tables")}
          value={searchText}
          onChangeText={setSearchText}
          accessoryLeft={(props) => <Icon {...props} name="search-outline" />}
          style={styles.searchInput as TextStyle}
        />
      </View>

      {/* Table List */}
      {loading ? (
        <View style={styles.loadingContainer as ViewStyle}>
          <Spinner size="large" />
          <Text category="s1" appearance="hint" style={{ marginTop: 16 }}>
            {t("loading_tables")}
          </Text>
        </View>
      ) : filteredTableIds.length === 0 && tableIds.length === 0 ? (
        <View style={styles.emptyContainer as ViewStyle}>
          <Icon
            style={{ width: 80, height: 80, marginBottom: 16 }}
            fill={theme["color-primary-300"]}
            name="grid-outline"
          />
          <Text category="h6" appearance="hint">
            {t("no_tables_yet")}
          </Text>
        </View>
      ) : (
        <View style={styles.tableListContainer as ViewStyle}>
          <Divider style={styles.divider as ViewStyle} />

          <ScrollView
            style={styles.tableList as ViewStyle}
            contentContainerStyle={styles.tableListContent as ViewStyle}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tableGrid as ViewStyle}>
              {filteredTableIds.map((id, index) => (
                <MemoizedTableCard
                  key={id}
                  tableId={id}
                  index={index}
                  setCardPropsCallback={setCardPropsCallback}
                />
              ))}
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      )}

      <FunctionCard
        cardProps={cardProps}
        setCardPropsCallback={setCardPropsCallback}
      />
    </Layout>
  );
};

const { width } = Dimensions.get("window");

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: "white",
    textAlign: "center",
    marginBottom: 24,
  },
  statsContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginHorizontal: 16,
  },
  statValue: {
    color: "white",
    fontWeight: "bold",
    marginBottom: 8,
  },
  statLabel: {
    color: "white",
    opacity: 0.9,
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    borderRadius: 24,
    backgroundColor: "white",
    borderColor: "color-basic-300",
  },
  divider: {
    marginBottom: 8,
  },
  tableListContainer: {
    flex: 1,
  },
  tableList: {
    flex: 1,
  },
  tableListContent: {
    padding: 16,
  },
  tableGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardWrapper: {
    width: "48%",
    marginBottom: 16,
  },
  tableCard: {
    borderRadius: 16,
    padding: 0,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "color-basic-200",
  },
  tableCardContent: {
    height: 140,
  },
  tableColorBand: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  tableIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  tableIcon: {
    width: 24,
    height: 24,
  },
  tableNameArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  tableName: {
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  tableDetailModal: {
    width: width * 0.9,
    maxHeight: "80%",
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: 8,
  },
  tableInfoSection: {
    marginTop: 8,
  },
  ordersList: {
    maxHeight: 300,
    marginTop: 16,
  },
  orderCard: {
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "color-basic-300",
  },
  orderCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emptyOrders: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
});

export default ManageTableScreen;
