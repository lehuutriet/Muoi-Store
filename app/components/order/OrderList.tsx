import React, { useState, useEffect } from "react";
import {
  ListRenderItemInfo,
  View,
  ImageBackground,
  Dimensions,
  TouchableOpacity,
  Alert,
} from "react-native";
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
// import { CategoryScrollbar } from "../../components/category";
// import ProductList from "../../components/product/ProductList";
import {
  allCategoryAtom,
  currentOrderAtom,
  allProductsAtom,
  productIdsAtom,
  productAtomFamily,
} from "../../states";

const OrderList = ({
  status = "all",
  date = new Date(),
}): React.ReactElement => {
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAllItem, createItem, updateItem, deleteItem } = useDatabases();
  const [orders, setOrders] = useState([]);
  const [waiting, setWaiting] = useState(false);
  const [order, setOrder] = useRecoilState(currentOrderAtom);
  const [loadMore, setLoadMore] = useState(false);
  const [orderLimit, setOrderLimit] = useState(20);
  const productData = useRecoilValue(allProductsAtom);
  const resetProductList = useRecoilCallback(
    ({ set }) =>
      async () => {
        for (const product of productData) {
          set(productAtomFamily(product.$id), product);
        }
      },
    []
  );

  useEffect(() => {
    let queries = [];
    const formatDate = date.toLocaleString("en-GB").slice(0, 10);
    switch (status) {
      case "all":
        queries = [
          Query.limit(orderLimit),
          Query.startsWith("date", formatDate),
          Query.orderDesc("date"),
        ];
        break;
      case "unpaid":
        queries = [
          Query.equal("status", "unpaid"),
          Query.startsWith("date", formatDate),
          Query.orderDesc("date"),
        ];
        break;
      case "paid":
        queries = [
          Query.equal("status", ["cash", "transfer"]),
          Query.startsWith("date", formatDate),
          Query.orderDesc("date"),
        ];
        break;
      default:
        break;
    }
    const loadOrders = async () => {
      console.log("filter::", orderLimit, status, formatDate, queries);
      const result = await getAllItem(COLLECTION_IDS.orders, queries);
      console.log("orderList::", result);
      setOrders(result);
    };
    loadOrders();
  }, [status, date, orderLimit]);

  const showAlertConfirm = (tilte: string, message: string, item) =>
    Alert.alert(
      tilte,
      message,
      [
        {
          text: t("no"),
          // onPress: () => false,
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
        // onDismiss: () =>
        //   Alert.alert(
        //     'This alert was dismissed by tapping outside of the alert dialog.',
        //   ),
      }
    );

  const viewOrder = async (orderInfo) => {
    console.log("orderInfo::", orderInfo);
    setOrder({
      $id: orderInfo.$id,
      note: orderInfo.note,
      table: orderInfo.table,
      total: orderInfo.total,
      discount: orderInfo.discount,
      subtract: orderInfo.subtract,
      date: new Date(orderInfo.$createdAt),
      order: JSON.parse(orderInfo.order),
    });
    resetProductList().then(() => {
      RootNavigation.navigate("ReviewOrderScreen");
    });
  };

  const cancelOrder = async (orderInfo) => {
    setWaiting(true);
    console.log("cancelOrder called::", orderInfo);
    await deleteItem(COLLECTION_IDS.orders, orderInfo.$id);
    setOrderLimit(orderLimit + 1);
    setWaiting(false);
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
  };

  const renderItem = (info): React.ReactElement => {
    // info.item.order = JSON.stringify(info.item.order);
    return (
      <Card
        style={[styles.cardItem]}
        // status="basic"
        // header={(headerProps) => renderItemHeader(headerProps, info)}
        // footer={renderItemFooter}
        onPress={() => {
          info.item.status === "unpaid"
            ? viewOrder(info.item)
            : RootNavigation.navigate("ReceiptScreen", {
                receiptData: info.item,
              });
        }}
      >
        <View style={styles.productCard}>
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Text
              appearance={info.item.status === "unpaid" ? "default" : "hint"}
            >
              {t("order_id") + ": " + info.item.$id.slice(-4)}
            </Text>
            <Text
              style={{ fontWeight: "bold" }}
              appearance={info.item.status === "unpaid" ? "default" : "hint"}
              status={info.item.status === "unpaid" ? "danger" : "basic"}
            >
              {t(info.item.status)}
            </Text>
          </View>
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Text
              appearance={info.item.status === "unpaid" ? "default" : "hint"}
            >
              {t("table_num") + ": " + info.item.table}
            </Text>
            <Text
              appearance={info.item.status === "unpaid" ? "default" : "hint"}
              style={{ paddingBottom: 10, fontSize: 13 }}
            >
              {info.item.date}
            </Text>
          </View>

          <View>
            <Divider></Divider>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                // width: Dimensions.get("window").width - 10,
                // alignItems:"center"
                paddingTop: 10,
              }}
            >
              <Text
                appearance={info.item.status === "unpaid" ? "default" : "hint"}
              >
                {t("final_price")}
              </Text>
              <Text
                style={{ fontWeight: "bold" }}
                status={info.item.status === "unpaid" ? "primary" : "basic"}
                appearance={info.item.status === "unpaid" ? "default" : "hint"}
              >
                {Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "VND",
                }).format(info.item.total)}
              </Text>
            </View>
          </View>

          {/* <Icon
          style={{ width: 20, height: 20 }}
          fill="white"
          name="printer-outline"
        /> */}

          {info.item.status === "unpaid" ? (
            <Layout level="1" style={styles.buttons}>
              <Button
                style={{
                  flex: 1,
                  marginRight: 5,
                  borderWidth: 0.5,
                  borderRadius: 5,
                  height: 25,
                }}
                appearance="outline"
                status="danger"
                size="small"
                onPress={() =>
                  showAlertConfirm("", t("cancel_order_confirm"), info.item)
                }
              >
                {t("remove")}
              </Button>
              <Button
                style={{
                  flex: 1,
                  marginLeft: 5,
                  borderWidth: 0.5,
                  borderRadius: 5,
                  height: 25,
                }}
                size="small"
                onPress={() => viewOrder(info.item)}
              >
                {t("update")}
              </Button>
            </Layout>
          ) : (
            <Layout level="1" style={styles.buttons}>
              <Button
                style={{
                  flex: 1,
                  marginLeft: 5,
                  borderWidth: 0.5,
                  borderRadius: 5,
                  height: 25,
                }}
                size="small"
                appearance="outline"
                status="primary"
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
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        data={orders}
        renderItem={renderItem}
        // numColumns={1}
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

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    width: "100%",
    // backgroundColor: "gray",
    // height: "100%",
  },
  contentContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    paddingBottom: 100,
  },
  cardItem: {
    // marginVertical: 4,
    // flex: 1 / 3,
    // borderColor: "green",
    marginBottom: 10,
    // borderLeftWidth: 0,
    // borderRightWidth: 0,
    // borderTopWidth: 0,
    // borderRadius: 10,
    // divider: 0,
  },
  productCard: {
    // display: "flex",
    // flexDirection: "row",
  },
  buttons: {
    display: "flex",
    flexDirection: "row",
    paddingTop: 10,
  },
  cardInfo: {
    // padding: 10,
    // backgroundColor: "pink",
    // display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    width: Dimensions.get("window").width - 120,
  },
  cardImg: {
    aspectRatio: 1,
    // padding: 10,
    width: 60,
    height: 60,
  },
  countIcon: {
    width: 20,
    height: 20,
  },
});

export { OrderList };
