import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  ViewStyle,
  ImageStyle,
  TextStyle,
  Dimensions,
} from "react-native";
import {
  Layout,
  Text,
  Card,
  Icon,
  Button,
  Avatar,
  Divider,
  StyleService,
  useStyleSheet,
  useTheme,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { useFocusEffect } from "@react-navigation/native";
import { Query } from "appwrite";
import { LinearGradient } from "expo-linear-gradient";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

// Định nghĩa kiểu dữ liệu
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

interface OrderHistory {
  $id: string;
  $createdAt: string;
  total: number;
  customer: string;
  status: string;
}

// Định nghĩa kiểu dữ liệu cho props
type RootStackParamList = {
  CustomerDetailScreen: { customer: Customer };
  EditCustomerScreen: { customer: Customer };
  CreateOrderScreen: { method: string };
  // Thêm các màn hình khác nếu cần
};

type CustomerDetailScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, "CustomerDetailScreen">;
  route: RouteProp<RootStackParamList, "CustomerDetailScreen">;
};

const CustomerDetailScreen: React.FC<CustomerDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { customer } = route.params;
  const styles = useStyleSheet(themedStyles);
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAllItem, getSingleItem, deleteItem, updateItem } = useDatabases();

  const [customerData, setCustomerData] = useState<Customer>(customer);
  const [customerOrders, setCustomerOrders] = useState<OrderHistory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Lấy chi tiết khách hàng mới nhất
  const refreshCustomerDetails = useCallback(async () => {
    try {
      setRefreshing(true);
      const updatedCustomer = await getSingleItem(
        COLLECTION_IDS.customers,
        customer.$id
      );
      if (updatedCustomer) {
        setCustomerData(updatedCustomer);
      }
      await fetchCustomerOrders(customer.$id);
      await recalculateTotalSpent(customer.$id);
    } catch (error) {
      console.error("Error refreshing customer details:", error);
    } finally {
      setRefreshing(false);
    }
  }, [customer.$id]);

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
      setCustomerData((prev) => ({ ...prev, totalSpent: totalSpent }));

      return totalSpent;
    } catch (error) {
      console.error("Lỗi khi tính lại tổng chi tiêu:", error);
      return 0;
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      refreshCustomerDetails();
      return () => {};
    }, [refreshCustomerDetails])
  );

  const handleDeleteCustomer = () => {
    Alert.alert(
      t("confirm_delete"),
      t("delete_customer_confirmation").replace("{name}", customerData.name),
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

  const confirmDeleteCustomer = async () => {
    try {
      setIsLoading(true);
      await deleteItem(COLLECTION_IDS.customers, customerData.$id);
      Alert.alert("", t("customer_deleted_successfully"));
      navigation.goBack(); // Quay lại màn hình danh sách
    } catch (error) {
      console.error("Error deleting customer:", error);
      Alert.alert("", t("error_deleting_customer"));
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <Layout style={styles.container as ViewStyle}>
      <ScrollView
        style={styles.scrollView as ViewStyle}
        contentContainerStyle={styles.contentContainer as ViewStyle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshCustomerDetails}
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
              {customerData.name}
            </Text>
            <Text
              category="p2"
              style={styles.customerHeaderContact as TextStyle}
            >
              {customerData.phone}
            </Text>
            {customerData.email && (
              <Text
                category="p2"
                style={styles.customerHeaderContact as TextStyle}
              >
                {customerData.email}
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
                {customerData.points}
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
                }).format(customerData.totalSpent)}
              </Text>
              <Text appearance="hint" style={styles.statLabel as TextStyle}>
                {t("total_spent")}
              </Text>
            </View>
          </View>

          {customerData.notes && (
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
                {customerData.notes}
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
                  customer: customerData,
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
          customerOrders.map((order) => (
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
    </Layout>
  );
};

const themedStyles = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-2",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
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
});

export default CustomerDetailScreen;
