import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  ScrollView,
  RefreshControl,
  Alert,
  ViewStyle,
  ImageStyle,
} from "react-native";
import {
  Layout,
  Text,
  Card,
  Icon,
  Input,
  Button,
  List,
  ListItem,
  Divider,
  Avatar,
  Tab,
  TabBar,
  StyleService,
  useStyleSheet,
  Modal,
  Spinner,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { FloatingAction } from "react-native-floating-action";
import { useFocusEffect } from "@react-navigation/native";
import { Query } from "appwrite";
import { TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// Định nghĩa kiểu dữ liệu cho khách hàng
interface Customer {
  $id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  totalSpent: number;
  lastVisit?: string;
  joinDate: string;
  notes?: string;
}

// Định nghĩa kiểu dữ liệu cho lịch sử đơn hàng
interface OrderHistory {
  $id: string;
  $createdAt: string;
  total: number;
  customer: string;
  status: string;
}

const { width } = Dimensions.get("window");
interface LoyalCustomerProps {
  navigation: any;
}

const LoyalCustomerScreen: React.FC<LoyalCustomerProps> = ({ navigation }) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const { getAllItem, createItem, updateItem, getSingleItem, deleteItem } =
    useDatabases();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerOrders, setCustomerOrders] = useState<OrderHistory[]>([]);
  const [pointsModalVisible, setPointsModalVisible] = useState(false);
  const [pointsToAdd, setPointsToAdd] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Lấy danh sách khách hàng
  const fetchCustomers = useCallback(async () => {
    try {
      setRefreshing(true);
      const customersData = await getAllItem(COLLECTION_IDS.customers);
      setCustomers(customersData);
      setFilteredCustomers(customersData);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setRefreshing(false);
    }
  }, [getAllItem]);

  const refreshCustomerDetails = useCallback(async () => {
    if (selectedCustomer) {
      try {
        const updatedCustomer = await getSingleItem(
          COLLECTION_IDS.customers,
          selectedCustomer.$id
        );
        if (updatedCustomer) {
          setSelectedCustomer(updatedCustomer);
        }
      } catch (error) {
        console.error("Error refreshing customer details:", error);
      }
    }
  }, [selectedCustomer]);

  // Sử dụng useFocusEffect để tải lại thông tin khách hàng khi quay lại màn hình
  useFocusEffect(
    React.useCallback(() => {
      if (selectedIndex === 1 && selectedCustomer) {
        refreshCustomerDetails();
      }
      return () => {};
    }, [selectedIndex, selectedCustomer, refreshCustomerDetails])
  );

  // Lấy lịch sử đơn hàng của khách hàng
  const fetchCustomerOrders = useCallback(
    async (customerId: string) => {
      try {
        const ordersData = await getAllItem(COLLECTION_IDS.orders, [
          Query.equal("customer", customerId),
          Query.orderDesc("$createdAt"),
        ]);
        setCustomerOrders(ordersData);
      } catch (error) {
        console.error("Error fetching customer orders:", error);
        setCustomerOrders([]);
      }
    },
    [getAllItem]
  );

  const handleDeleteCustomer = () => {
    if (!selectedCustomer) return;

    Alert.alert(
      t("confirm_delete"),
      t("delete_customer_confirmation").replace(
        "{name}",
        selectedCustomer.name
      ),
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: t("delete"),
          style: "destructive",
          onPress: confirmDeleteCustomer,
        },
      ]
    );
  };

  // Tính lại tổng chi tiêu của khách hàng
  const recalculateTotalSpent = async (customerId: string) => {
    try {
      // Lấy đơn hàng thanh toán bằng tiền mặt
      const cashOrders = await getAllItem(COLLECTION_IDS.orders, [
        Query.equal("customer", customerId),
        Query.equal("status", "cash"),
      ]);

      // Lấy đơn hàng thanh toán bằng chuyển khoản
      const transferOrders = await getAllItem(COLLECTION_IDS.orders, [
        Query.equal("customer", customerId),
        Query.equal("status", "transfer"),
      ]);

      // Gộp lại
      const orders = [...cashOrders, ...transferOrders];
      // Tính tổng chi tiêu
      let totalSpent = 0;
      for (const order of orders) {
        totalSpent += order.total || 0;
      }

      // Cập nhật totalSpent trong cơ sở dữ liệu
      await updateItem(COLLECTION_IDS.customers, customerId, {
        totalSpent: totalSpent,
      });

      // Cập nhật thông tin khách hàng trong state
      if (selectedCustomer && selectedCustomer.$id === customerId) {
        setSelectedCustomer({ ...selectedCustomer, totalSpent: totalSpent });
      }

      console.log(`Đã tính lại tổng chi tiêu: ${totalSpent}`);
      return totalSpent;
    } catch (error) {
      console.error("Lỗi khi tính lại tổng chi tiêu:", error);
      return 0;
    }
  };

  const confirmDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      setIsLoading(true);
      await deleteItem(COLLECTION_IDS.customers, selectedCustomer.$id);
      Alert.alert("", t("customer_deleted_successfully"));
      setSelectedCustomer(null);
      setSelectedIndex(0); // Chuyển về tab danh sách
      fetchCustomers(); // Tải lại danh sách khách hàng
    } catch (error) {
      console.error("Error deleting customer:", error);
      Alert.alert("", t("error_deleting_customer"));
    } finally {
      setIsLoading(false);
    }
  };

  // Filter customers based on search text
  useEffect(() => {
    if (searchText) {
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchText.toLowerCase()) ||
          customer.phone.includes(searchText)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchText, customers]);

  useFocusEffect(
    React.useCallback(() => {
      fetchCustomers();
      return () => {};
    }, [])
  );

  const onRefresh = useCallback(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchCustomerOrders(customer.$id);
    setSelectedIndex(1); // Chuyển sang tab thông tin chi tiết
    recalculateTotalSpent(customer.$id);
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <Card
      style={styles.customerListItem as ViewStyle}
      onPress={() => handleSelectCustomer(item)}
    >
      <View style={styles.customerListItemContent as ViewStyle}>
        <View style={styles.customerAvatarContainer as ViewStyle}>
          <Avatar
            style={styles.avatar as ImageStyle}
            source={require("../../assets/avatar-placeholder.png")}
          />
        </View>
        <View style={styles.customerDetails as ViewStyle}>
          <Text category="s1" style={styles.customerName as TextStyle}>
            {item.name}
          </Text>
          <Text category="p2" appearance="hint">
            {item.phone}
          </Text>
          <View style={styles.pointsDisplay as ViewStyle}>
            <Icon
              name="award-outline"
              fill="#FFD700"
              style={styles.pointsIcon as ImageStyle}
            />
            <Text category="c1" status="warning">
              {item.points} {t("points")}
            </Text>
          </View>
        </View>
        <Icon
          name="chevron-right-outline"
          fill="#BDBDBD"
          style={styles.chevronIcon as ImageStyle}
        />
      </View>
    </Card>
  );

  const renderOrderItem = ({ item }: { item: OrderHistory }) => (
    <Card style={styles.orderCard as ViewStyle}>
      <LinearGradient
        colors={
          item.status === "unpaid"
            ? ["#FFEBEE", "#FFCDD2"]
            : ["#E8F5E9", "#C8E6C9"]
        }
        style={styles.orderGradient as ViewStyle}
      />
      <View style={styles.orderHeader as ViewStyle}>
        <View style={styles.orderIdContainer as ViewStyle}>
          <Icon
            name="shopping-bag-outline"
            fill={item.status === "unpaid" ? "#F44336" : "#4CAF50"}
            style={styles.orderIdIcon as ImageStyle}
          />
          <Text category="s1">
            {t("order_id")}: {item.$id.slice(-4)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge as ViewStyle,
            {
              backgroundColor:
                item.status === "unpaid"
                  ? "rgba(244, 67, 54, 0.1)"
                  : "rgba(76, 175, 80, 0.1)",
            },
          ]}
        >
          <Text
            status={item.status === "unpaid" ? "danger" : "success"}
            category="c1"
            style={styles.statusText as TextStyle}
          >
            {t(item.status)}
          </Text>
        </View>
      </View>
      <Divider style={styles.orderDivider as ViewStyle} />
      <View style={styles.orderInfo as ViewStyle}>
        <View style={styles.orderDateContainer as ViewStyle}>
          <Icon
            name="calendar-outline"
            fill="#757575"
            style={styles.orderDateIcon as ImageStyle}
          />
          <Text category="p2" appearance="hint">
            {new Date(item.$createdAt).toLocaleString()}
          </Text>
        </View>
        <View style={styles.orderAmount as ViewStyle}>
          <Text category="s1" style={styles.amountText as TextStyle}>
            {Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(item.total)}
          </Text>
        </View>
      </View>
    </Card>
  );

  const renderCustomerList = () => (
    <Layout style={styles.tabContent as ViewStyle}>
      <View style={styles.searchContainer as ViewStyle}>
        <Input
          placeholder={t("search_customers")}
          value={searchText}
          onChangeText={setSearchText}
          accessoryLeft={(props) => (
            <Icon {...props} name="search-outline" fill="#4169E1" />
          )}
          style={styles.searchInput as TextStyle}
        />
      </View>

      {filteredCustomers.length > 0 ? (
        <List
          data={filteredCustomers}
          renderItem={renderCustomerItem}
          style={styles.list as ViewStyle}
          contentContainerStyle={styles.listContent as ViewStyle}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer as ViewStyle}>
          <Icon
            name="people-outline"
            fill="#E0E0E0"
            style={styles.emptyIcon as ImageStyle}
          />
          <Text appearance="hint" style={styles.emptyText as TextStyle}>
            {t("no_customers_found")}
          </Text>
          <Button
            appearance="ghost"
            status="primary"
            onPress={() => navigation.navigate("AddCustomerScreen")}
            style={styles.emptyActionButton as ViewStyle}
          >
            {t("add_customer")}
          </Button>
        </View>
      )}
    </Layout>
  );

  const renderCustomerDetails = () => {
    if (!selectedCustomer) {
      return (
        <View style={styles.emptyContainer as ViewStyle}>
          <Icon
            name="person-outline"
            fill="#E0E0E0"
            style={styles.emptyIcon as ImageStyle}
          />
          <Text appearance="hint" style={styles.emptyText as TextStyle}>
            {t("select_customer")}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.tabContent as ViewStyle}
        contentContainerStyle={styles.detailsContainer as ViewStyle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              if (selectedCustomer) {
                refreshCustomerDetails();
                fetchCustomerOrders(selectedCustomer.$id);
                recalculateTotalSpent(selectedCustomer.$id);
              }
            }}
          />
        }
      >
        <Card style={styles.customerCard as ViewStyle}>
          <LinearGradient
            colors={["#4169E1", "#3151B7"]}
            style={styles.customerCardHeader as ViewStyle}
          >
            <Avatar
              source={require("../../assets/avatar-placeholder.png")}
              style={styles.detailAvatar as ImageStyle}
            />
            <Text category="h6" style={styles.customerHeaderName as TextStyle}>
              {selectedCustomer.name}
            </Text>
            <Text
              category="p2"
              style={styles.customerHeaderContact as TextStyle}
            >
              {selectedCustomer.phone}
            </Text>
            {selectedCustomer.email && (
              <Text
                category="p2"
                style={styles.customerHeaderContact as TextStyle}
              >
                {selectedCustomer.email}
              </Text>
            )}
          </LinearGradient>

          <View style={styles.statsRow as ViewStyle}>
            <View style={styles.statItem as ViewStyle}>
              <View style={styles.statIconContainer as ViewStyle}>
                <Icon
                  name="award"
                  fill="#4169E1"
                  style={styles.statIcon as ImageStyle}
                />
              </View>
              <Text category="h5" style={styles.statValue as TextStyle}>
                {selectedCustomer.points}
              </Text>
              <Text appearance="hint" style={styles.statLabel as TextStyle}>
                {t("points")}
              </Text>
            </View>

            <View style={styles.verticalDivider as ViewStyle} />

            <View style={styles.statItem as ViewStyle}>
              <View style={styles.statIconContainer as ViewStyle}>
                <Icon
                  name="credit-card"
                  fill="#4CAF50"
                  style={styles.statIcon as ImageStyle}
                />
              </View>
              <Text category="h5" style={styles.statValue as TextStyle}>
                {Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                  maximumFractionDigits: 0,
                }).format(selectedCustomer.totalSpent)}
              </Text>
              <Text appearance="hint" style={styles.statLabel as TextStyle}>
                {t("total_spent")}
              </Text>
            </View>
          </View>

          {selectedCustomer.notes && (
            <View style={styles.notesContainer as ViewStyle}>
              <View style={styles.notesHeader as ViewStyle}>
                <Icon
                  name="message-square-outline"
                  fill="#757575"
                  style={styles.notesIcon as ImageStyle}
                />
                <Text category="s1" style={styles.notesTitle as TextStyle}>
                  {t("notes")}
                </Text>
              </View>
              <Text style={styles.notesContent as TextStyle}>
                {selectedCustomer.notes}
              </Text>
            </View>
          )}

          <View style={styles.actionButtons as ViewStyle}>
            <Button
              size="medium"
              status="basic"
              accessoryLeft={(props) => (
                <Icon {...props} name="edit-2-outline" />
              )}
              style={styles.actionButton as ViewStyle}
              onPress={() =>
                navigation.navigate("EditCustomerScreen", {
                  customer: selectedCustomer,
                })
              }
            >
              {t("edit")}
            </Button>

            <Button
              size="medium"
              status="danger"
              accessoryLeft={(props) => (
                <Icon {...props} name="trash-2-outline" />
              )}
              style={styles.actionButton as ViewStyle}
              onPress={handleDeleteCustomer}
            >
              {t("delete")}
            </Button>
          </View>
        </Card>

        <View style={styles.sectionTitleContainer as ViewStyle}>
          <Icon
            name="clock-outline"
            fill="#4169E1"
            style={styles.sectionTitleIcon as ImageStyle}
          />
          <Text category="h6" style={styles.sectionTitle as TextStyle}>
            {t("order_history")}
          </Text>
        </View>

        {customerOrders.length > 0 ? (
          customerOrders.map((order, index) => (
            <View key={order.$id}>{renderOrderItem({ item: order })}</View>
          ))
        ) : (
          <Card style={styles.emptyOrdersCard as ViewStyle}>
            <View style={styles.emptyOrdersContent as ViewStyle}>
              <Icon
                name="calendar-outline"
                fill="#E0E0E0"
                style={styles.emptyOrdersIcon as ImageStyle}
              />
              <Text
                appearance="hint"
                style={styles.emptyOrdersText as TextStyle}
              >
                {t("no_orders_yet")}
              </Text>
              <Button
                size="small"
                appearance="ghost"
                status="primary"
                style={styles.emptyOrdersButton as ViewStyle}
                onPress={() =>
                  navigation.navigate("CreateOrderScreen", {
                    method: "create",
                  })
                }
              >
                {t("create_order")}
              </Button>
            </View>
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  const renderPointsModal = () => (
    <Modal
      visible={pointsModalVisible}
      backdropStyle={styles.backdrop as ViewStyle}
      onBackdropPress={() => {
        if (!isLoading) {
          setPointsModalVisible(false);
          setPointsToAdd("");
        }
      }}
    >
      <Card style={styles.modalCard as ViewStyle}>
        <View style={styles.modalHeaderContainer as ViewStyle}>
          <Icon
            name="award"
            fill="#4169E1"
            style={styles.modalHeaderIcon as ImageStyle}
          />
          <Text category="h6" style={styles.modalTitle as TextStyle}>
            {t("add_points")}
          </Text>
        </View>

        <View style={styles.modalCustomerInfo as ViewStyle}>
          <Text category="s1">{selectedCustomer?.name}</Text>
          <Text appearance="hint">{selectedCustomer?.phone}</Text>
        </View>

        <View style={styles.currentPointsDisplay as ViewStyle}>
          <Text
            appearance="hint"
            style={styles.currentPointsLabel as TextStyle}
          >
            {t("current_points")}
          </Text>
          <Text category="h5" style={styles.currentPointsValue as TextStyle}>
            {selectedCustomer?.points || 0}
          </Text>
        </View>

        <Divider style={styles.modalDivider as ViewStyle} />

        <Text category="s1" style={styles.addPointsLabel as TextStyle}>
          {t("enter_points_to_add")}
        </Text>
        <Input
          placeholder="0"
          value={pointsToAdd}
          onChangeText={setPointsToAdd}
          keyboardType="numeric"
          size="large"
          style={styles.modalInput as TextStyle}
          disabled={isLoading}
          accessoryLeft={(props) => <Icon {...props} name="plus-outline" />}
        />
      </Card>
    </Modal>
  );

  const actions = [
    {
      text: t("add_customer"),
      icon: require("../../assets/icons/plus-outline.png"),
      name: "AddCustomer",
      position: 1,
    },
  ];

  return (
    <Layout style={styles.container as ViewStyle}>
      <TabBar
        selectedIndex={selectedIndex}
        onSelect={(index) => setSelectedIndex(index)}
        style={styles.tabBar as ViewStyle}
        indicatorStyle={styles.tabIndicator as ViewStyle}
      >
        <Tab
          title={t("customers_list")}
          icon={(props) => <Icon {...props} name="people-outline" />}
        />
        <Tab
          title={t("customer_details")}
          icon={(props) => <Icon {...props} name="person-outline" />}
          disabled={!selectedCustomer}
        />
      </TabBar>

      {selectedIndex === 0 ? renderCustomerList() : renderCustomerDetails()}
      {renderPointsModal()}
      <FloatingAction
        actions={actions}
        color="#4169E1"
        showBackground={true}
        distanceToEdge={16}
        overlayColor="rgba(0, 0, 0, 0.6)"
        onPressItem={(name) => {
          if (name === "AddCustomer") {
            navigation.navigate("AddCustomerScreen");
          }
        }}
      />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-2",
  },
  tabBar: {
    elevation: 4,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    backgroundColor: "background-basic-color-1",
  },
  tabIndicator: {
    backgroundColor: "color-primary-500",
    height: 3,
    borderRadius: 3,
  },
  tabContent: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "background-basic-color-1",
    borderBottomWidth: 1,
    borderBottomColor: "background-basic-color-3",
  },
  searchInput: {
    borderRadius: 24,
    backgroundColor: "background-basic-color-1",
    borderColor: "background-basic-color-3",
  },
  list: {
    backgroundColor: "transparent",
  },
  listContent: {
    padding: 8,
    paddingBottom: 80,
  },
  customerListItem: {
    marginBottom: 8,
    marginHorizontal: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  customerListItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  customerAvatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  pointsDisplay: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  pointsIcon: {
    width: 14,
    height: 14,
    marginRight: 4,
  },
  chevronIcon: {
    width: 20,
    height: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    textAlign: "center",
    marginBottom: 16,
  },
  emptyActionButton: {
    marginTop: 8,
  },

  // Customer details styling
  detailsContainer: {
    padding: 16,
  },
  customerCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    elevation: 4,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  customerCardHeader: {
    alignItems: "center",
    padding: 24,
    paddingTop: 32,
  },
  detailAvatar: {
    width: 80,
    height: 80,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "white",
  },
  customerHeaderName: {
    color: "white",
    fontWeight: "bold",
    marginBottom: 4,
  },
  customerHeaderContact: {
    color: "white",
    opacity: 0.9,
    marginBottom: 4,
  },
  membershipBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  membershipIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  membershipText: {
    color: "white",
    fontWeight: "bold",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "background-basic-color-2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statIcon: {
    width: 24,
    height: 24,
  },
  statValue: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  verticalDivider: {
    width: 1,
    height: "70%",
    backgroundColor: "background-basic-color-3",
    alignSelf: "center",
  },
  notesContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: "background-basic-color-2",
    borderRadius: 12,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  notesIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  notesTitle: {
    fontWeight: "bold",
  },
  notesContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "background-basic-color-3",
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  sectionTitle: {
    fontWeight: "bold",
  },
  orderCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    elevation: 2,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  orderGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderIdIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontWeight: "bold",
    fontSize: 12,
  },
  orderDivider: {
    marginHorizontal: 16,
  },
  orderInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  orderDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderDateIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  orderAmount: {
    backgroundColor: "background-basic-color-2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amountText: {
    fontWeight: "bold",
  },
  emptyOrdersCard: {
    borderRadius: 16,
    elevation: 2,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  emptyOrdersContent: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyOrdersIcon: {
    width: 64,
    height: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyOrdersText: {
    textAlign: "center",
    marginBottom: 8,
  },
  emptyOrdersButton: {
    marginTop: 8,
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalCard: {
    width: width - 48,
    borderRadius: 16,
    padding: 24,
  },
  modalHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  modalHeaderIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  modalTitle: {
    fontWeight: "bold",
  },
  modalCustomerInfo: {
    marginBottom: 16,
  },
  currentPointsDisplay: {
    backgroundColor: "background-basic-color-2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  currentPointsLabel: {
    marginBottom: 4,
  },
  currentPointsValue: {
    fontWeight: "bold",
    color: "color-primary-500",
  },
  modalDivider: {
    marginBottom: 16,
  },
  addPointsLabel: {
    marginBottom: 8,
  },
  modalInput: {
    marginBottom: 24,
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  modalSubtitle: {
    textAlign: "center",
    marginBottom: 16,
  },
});
export default LoyalCustomerScreen;
