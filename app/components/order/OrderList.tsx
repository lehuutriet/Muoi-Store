import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ImageBackground,
  Dimensions,
  TouchableOpacity,
  Alert,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { StyleProp } from "react-native";

import {
  Button,
  Card,
  List,
  Text,
  Icon,
  useStyleSheet,
  useTheme,
  StyleService,
  Divider,
  Layout,
  Modal,
  Spinner,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { Query } from "appwrite";
import { useStorage, useDatabases, COLLECTION_IDS } from "../../hook/AppWrite";
import { WaitingModal } from "../common";
import QRCode from "react-native-qrcode-svg";

import { useRecoilState, useRecoilValue, useRecoilCallback } from "recoil";
import * as RootNavigation from "../../navigator/RootNavigation";
import { FloatingAction } from "react-native-floating-action";
import {
  allCategoryAtom,
  currentOrderAtom,
  allProductsAtom,
  productIdsAtom,
  productAtomFamily,
} from "../../states";
import { useFocusEffect } from "@react-navigation/native";

interface Product {
  $id: string;
  name: string;
  photo: string;
  photoUrl: string;
  price: number;
  cost: number;
  category: string;
  count: number;
  description: string;
}

interface OrderListStyles {
  container: ViewStyle;
  contentContainer: ViewStyle;
  cardItem: ViewStyle;
  productCard: ViewStyle;
  buttons: ViewStyle;
  cardInfo: ViewStyle;
  cardImg: ImageStyle;
  countIcon: ImageStyle;
  orderHeader: ViewStyle;
  orderIdContainer: ViewStyle;
  orderIcon: ImageStyle;
  statusBadge: ViewStyle;
  orderInfoRow: ViewStyle;
  infoItem: ViewStyle;
  infoIcon: ImageStyle;
  divider: ViewStyle;
  priceContainer: ViewStyle;
  actionButton: ViewStyle;
  receiptButton: ViewStyle;
  emptyContainer: ViewStyle;
  emptyIcon: ImageStyle;
  emptyText: TextStyle;
}

interface OrderInterface {
  $id: string;
  note: string;
  table: string;
  total: number;
  discount: number;
  subtract: number;
  $createdAt: string;
  date: string;
  status: string;
  order: string;
}

const OrderList = ({
  status = "all",
  date = new Date(),
}): React.ReactElement => {
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAllItem, createItem, updateItem, deleteItem } = useDatabases();
  const [orders, setOrders] = useState<OrderInterface[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [order, setOrder] = useRecoilState(currentOrderAtom);
  const [loadMore, setLoadMore] = useState(false);
  const [orderLimit, setOrderLimit] = useState(20);
  const productData = useRecoilValue<Product[]>(allProductsAtom);

  const resetProductList = useRecoilCallback(
    ({ set }) =>
      async () => {
        for (const product of productData) {
          set(productAtomFamily(product.$id), product);
        }
      },
    []
  );

  let queries: string[] = [];

  // Chuyển đổi định dạng ngày cho đúng - sử dụng định dạng YYYY-MM-DD
  const formatDate = date.toISOString().split("T")[0];

  // Lấy giới hạn ngày - từ 00:00:00 đến 23:59:59 của ngày được chọn
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  switch (status) {
    case "all":
      queries = [
        Query.limit(orderLimit),
        Query.greaterThanEqual("$createdAt", startDate.toISOString()),
        Query.lessThanEqual("$createdAt", endDate.toISOString()),
        Query.orderDesc("$createdAt"),
      ];
      break;
    case "unpaid":
      queries = [
        Query.equal("status", "unpaid"),
        Query.greaterThanEqual("$createdAt", startDate.toISOString()),
        Query.lessThanEqual("$createdAt", endDate.toISOString()),
        Query.orderDesc("$createdAt"),
      ];
      break;
    case "paid":
      queries = [
        Query.equal("status", ["cash", "transfer"]),
        Query.greaterThanEqual("$createdAt", startDate.toISOString()),
        Query.lessThanEqual("$createdAt", endDate.toISOString()),
        Query.orderDesc("$createdAt"),
      ];
      break;
    default:
      break;
  }

  const loadOrders = async () => {
    console.log(
      "filter:: startDate:",
      startDate.toISOString(),
      "endDate:",
      endDate.toISOString()
    );
    console.log("queries::", queries);
    const result = await getAllItem(COLLECTION_IDS.orders, queries);
    console.log("orderList::", result);
    setOrders(result);
  };

  useEffect(() => {
    loadOrders();
  }, [status, date, orderLimit]);

  const showAlertConfirm = (
    tilte: string,
    message: string,
    item: OrderInterface
  ) =>
    Alert.alert(
      tilte,
      message,
      [
        {
          text: t("no"),
          style: "cancel",
        },
        {
          text: t("yes"),
          onPress: () => cancelOrder(item),
          style: "default",
        },
      ],
      {
        cancelable: true,
      }
    );

  useFocusEffect(
    React.useCallback(() => {
      loadOrders();
      return () => {};
    }, [status, date, orderLimit])
  );

  // Tạo hàm refreshOrders
  const refreshOrders = () => {
    loadOrders();
  };

  const viewOrder = async (orderInfo: any) => {
    console.log("orderInfo::", orderInfo);

    // Chuyển đổi mảng chuỗi thành mảng đối tượng
    const parsedOrderItems = orderInfo.order.map((itemString: any) =>
      JSON.parse(itemString)
    );

    setOrder({
      $id: orderInfo.$id,
      note: orderInfo.note,
      table: orderInfo.table,
      total: orderInfo.total,
      discount: orderInfo.discount,
      subtract: orderInfo.subtract,
      date: new Date(orderInfo.$createdAt),
      order: parsedOrderItems,
    });

    resetProductList().then(() => {
      RootNavigation.navigate("ReviewOrderScreen", {
        onGoBack: refreshOrders, // Thêm callback này
      });
    });
  };

  const cancelOrder = async (orderInfo: any) => {
    setWaiting(true);
    console.log("cancelOrder called::", orderInfo);
    try {
      await deleteItem(COLLECTION_IDS.orders, orderInfo.$id);

      refreshOrders();
      Alert.alert(
        "",
        t("order_canceled"),
        [
          {
            text: t("ok"),
            style: "default",
          },
        ],
        {
          cancelable: true,
        }
      );
    } catch (error) {
      console.error("Lỗi khi hủy đơn hàng:", error);
    } finally {
      setWaiting(false);
    }
  };

  // Hàm định dạng ngày
  const formatDateString = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
    } catch (e) {
      return dateString;
    }
  };

  const renderItem = (info: any): React.ReactElement => {
    return (
      <Card
        style={[
          styles.cardItem as ViewStyle,
          {
            borderLeftWidth: 4,
            borderLeftColor:
              info.item.status === "unpaid"
                ? theme["color-danger-500"]
                : info.item.status === "returned"
                  ? theme["color-warning-500"]
                  : theme["color-success-500"],
          },
        ]}
        onPress={() => {
          info.item.status === "unpaid"
            ? viewOrder(info.item)
            : RootNavigation.navigate("ReceiptScreen", {
                receiptData: info.item,
              });
        }}
      >
        <View style={styles.productCard as ViewStyle}>
          {/* Header với ID đơn hàng và trạng thái */}
          <View style={styles.orderHeader as ViewStyle}>
            <View style={styles.orderIdContainer as ViewStyle}>
              <Icon
                name="shopping-cart-outline"
                fill={theme["color-primary-500"]}
                style={styles.orderIcon as ImageStyle}
              />
              <Text
                category="s1"
                appearance={info.item.status === "unpaid" ? "default" : "hint"}
              >
                {t("order_id") + ": " + info.item.$id.slice(-4)}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge as ViewStyle,
                {
                  backgroundColor:
                    info.item.status === "unpaid"
                      ? theme["color-danger-100"]
                      : info.item.status === "returned"
                        ? theme["color-warning-100"]
                        : theme["color-success-100"],
                },
              ]}
            >
              <Text
                category="c1"
                style={{
                  color:
                    info.item.status === "unpaid"
                      ? theme["color-danger-700"]
                      : info.item.status === "returned"
                        ? theme["color-warning-700"]
                        : theme["color-success-700"],
                  fontWeight: "bold",
                }}
              >
                {info.item.status === "returned"
                  ? t("returned")
                  : t(info.item.status)}
              </Text>
            </View>
          </View>

          {/* Thông tin bàn và ngày đặt */}
          <View style={styles.orderInfoRow as ViewStyle}>
            <View style={styles.infoItem as ViewStyle}>
              <Icon
                name="home-outline"
                fill={theme["color-basic-600"]}
                style={styles.infoIcon as ImageStyle}
              />
              <Text
                category="p2"
                appearance={info.item.status === "unpaid" ? "default" : "hint"}
              >
                {t("table_num") + ": " + info.item.table}
              </Text>
            </View>

            <View style={styles.infoItem as ViewStyle}>
              <Icon
                name="calendar-outline"
                fill={theme["color-basic-600"]}
                style={styles.infoIcon as ImageStyle}
              />
              <Text
                category="p2"
                appearance={info.item.status === "unpaid" ? "default" : "hint"}
              >
                {formatDateString(info.item.$createdAt)}
              </Text>
            </View>
          </View>

          <Divider style={styles.divider as ViewStyle} />

          {/* Phần hiển thị giá */}
          <View style={styles.priceContainer as ViewStyle}>
            <Text
              category="s2"
              appearance={info.item.status === "unpaid" ? "default" : "hint"}
            >
              {t("final_price")}
            </Text>
            <Text
              category="h6"
              status={info.item.status === "unpaid" ? "primary" : "basic"}
              appearance={info.item.status === "unpaid" ? "default" : "hint"}
            >
              {Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(info.item.total)}
            </Text>
          </View>

          {/* Nút thao tác */}
          {info.item.status === "unpaid" ? (
            <Layout level="1" style={styles.buttons as ViewStyle}>
              <Button
                style={styles.actionButton as ViewStyle}
                appearance="outline"
                status="danger"
                size="small"
                accessoryLeft={(props) => (
                  <Icon {...props} name="trash-2-outline" />
                )}
                onPress={() =>
                  showAlertConfirm("", t("cancel_order_confirm"), info.item)
                }
              >
                {t("remove")}
              </Button>
              <Button
                style={styles.actionButton as ViewStyle}
                size="small"
                status="primary"
                accessoryLeft={(props) => (
                  <Icon {...props} name="edit-2-outline" />
                )}
                onPress={() => viewOrder(info.item)}
              >
                {t("update")}
              </Button>
            </Layout>
          ) : (
            <Layout level="1" style={styles.buttons as ViewStyle}>
              <Button
                style={styles.receiptButton as ViewStyle}
                size="small"
                appearance="outline"
                status="primary"
                accessoryLeft={(props) => (
                  <Icon {...props} name="file-text-outline" />
                )}
                onPress={() =>
                  RootNavigation.navigate("ReceiptScreen", {
                    receiptData: info.item,
                  })
                }
              >
                {t("show_receipt")}
              </Button>
            </Layout>
          )}
        </View>
      </Card>
    );
  };

  return (
    <>
      <WaitingModal waiting={waiting} />
      <List
        style={styles.container as ViewStyle}
        contentContainerStyle={styles.contentContainer as ViewStyle}
        data={orders}
        renderItem={renderItem}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer as ViewStyle}>
            <Icon
              name="shopping-cart-outline"
              fill={theme["color-basic-400"]}
              style={styles.emptyIcon as ImageStyle}
            />
            <Text appearance="hint" style={styles.emptyText as TextStyle}>
              {t("no_orders_found")}
            </Text>
          </View>
        )}
        onScroll={() => {
          status === "all" ? setLoadMore(true) : setLoadMore(false);
        }}
        onEndReached={() => {
          if (status === "all" && loadMore && orderLimit <= orders.length) {
            console.log("onEndReached::", orders.length);
            setOrderLimit(orderLimit + 20);
          }
        }}
      />
    </>
  );
};

const styleSheet = StyleService.create<OrderListStyles>({
  container: {
    flex: 1,
    width: "100%",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 100,
  },
  cardItem: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  productCard: {
    paddingVertical: 4,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  divider: {
    marginVertical: 8,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  buttons: {
    display: "flex",
    flexDirection: "row",
    paddingTop: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 6,
  },
  receiptButton: {
    flex: 1,
    borderRadius: 6,
  },
  cardInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: Dimensions.get("window").width - 120,
  },
  cardImg: {
    aspectRatio: 1,
    width: 60,
    height: 60,
  },
  countIcon: {
    width: 20,
    height: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    textAlign: "center",
    opacity: 0.8,
  },
});

export { OrderList };
