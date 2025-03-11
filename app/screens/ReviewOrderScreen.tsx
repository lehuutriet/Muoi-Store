import React, { useState, useEffect } from "react";

import {
  ScrollView,
  StyleSheet,
  // Text,
  TouchableOpacity,
  View,
  Image,
  Dimensions,
  ListRenderItemInfo,
  ImageBackground,
  Alert,
  ImageStyle,
  ViewStyle,
  TextStyle,
} from "react-native";
import {
  StyleService,
  useStyleSheet,
  Layout,
  Input,
  Icon,
  useTheme,
  Select,
  SelectItem,
  IndexPath,
  Text,
  Button,
  Card,
  List,
  Divider,
  Calendar,
  Datepicker,
  NativeDateService,
  Modal,
  Spinner,
} from "@ui-kitten/components";
import { WaitingModal } from "../components/common";
import { createNumberMask, useMaskedInputProps } from "react-native-mask-input";
import { useTranslation } from "react-i18next";
import { i18nCalendar as i18n } from "../i18/i18n.config";
import { useRecoilCallback, useRecoilState, useRecoilValue } from "recoil";
import {
  allProductsAtom,
  allTablesAtom,
  currentOrderAtom,
  productAtomFamily,
  userAtom,
} from "../states";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import * as RootNavigation from "../navigator/RootNavigation";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
const vndMask = createNumberMask({
  // prefix: ['đ'],
  delimiter: ",",
  separator: ",",
  precision: 3,
});

interface Table {
  $id: string;
  name: string;
}
interface OrderItem {
  $id: string;
  name: string;
  photoUrl?: string;
  price: number;
  count: number;
}

type RootStackParamList = {
  ReviewOrderScreen: { orderInfo?: any };
  ReceiptScreen: { receiptData: any };
  CreateOrderScreen: { method: string };
  // Thêm các màn hình khác mà bạn cần điều hướng từ ReviewOrderScreen
};

// Sử dụng NativeStackScreenProps để định nghĩa props
type ReviewOrderScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ReviewOrderScreen"
>;

const ReviewOrderScreen: React.FC<ReviewOrderScreenProps> = ({
  route,
  navigation,
}) => {
  console.log("ReviewOrderScreen params::");
  const styles = useStyleSheet(styleSheet);

  const { t } = useTranslation();
  const { createItem, updateItem, getSingleItem, getAllItem } = useDatabases();
  const [waiting, setWaiting] = useState(false);

  const [order, setOrder] = useRecoilState(currentOrderAtom);
  const userInfo = useRecoilValue(userAtom);
  const [totalPrice, setTotalPrice] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [tables, setTables] = useRecoilState<Table[]>(allTablesAtom);
  const [selectedTableIndex, setSelectedTableIndex] = React.useState<IndexPath>(
    new IndexPath(0)
  );

  // Trong phần khai báo state
  const [selectedLocationIndex, setSelectedLocationIndex] =
    React.useState<IndexPath>(
      new IndexPath(0) // Mặc định là 'dine-in'
    );

  // Trong useEffect khởi tạo
  useEffect(() => {
    console.log("userInfo::", userInfo);

    if (order && order.$id) {
      setOrder({ ...order, $id: order.$id });
      let tableIndex = tables.findIndex((table) => table.name === order.table);
      tableIndex = tableIndex >= 0 ? tableIndex + 1 : 0;
      setSelectedTableIndex(new IndexPath(tableIndex));

      // Thêm phần khởi tạo vị trí
      const locationTypes = ["dine-in", "take-away", "delivery"];
      const locationIndex = locationTypes.indexOf(order.location || "dine-in");
      setSelectedLocationIndex(
        new IndexPath(locationIndex >= 0 ? locationIndex : 0)
      );
    }
  }, []);

  useEffect(() => {
    if (order && order.order && order.order.length > 0) {
      let sum = order.order.reduce((acc, item) => {
        if (item.price && item.count) {
          return acc + item.price * item.count;
        }
        return acc;
      }, 0);
      console.log("setTotalPrice::", sum);
      setTotalPrice(sum);
      // minus subtract
      sum = order.subtract > 0 ? sum - order.subtract : sum;
      // minus discount
      sum =
        order.discount > 0
          ? sum - Math.round((sum * order.discount) / 100)
          : sum;
      setFinalPrice(sum);
    }
  }, [order]);

  const updateOrderList = (newItem: OrderItem, method: "add" | "sub") => {
    const item = JSON.parse(JSON.stringify(newItem)) as typeof newItem;
    const index = order.order.findIndex((item) => item.$id === newItem.$id);
    let newOrder = [...order.order];
    if (index >= 0) {
      newOrder = order.order.map((obj) => {
        if (obj.$id === newItem.$id) {
          return {
            ...obj,
            count:
              method === "add"
                ? obj.count + 1
                : method === "sub"
                  ? obj.count - 1
                  : obj.count,
          };
        }
        return obj;
      });
    } else {
      item.count = method === "add" ? 1 : method === "sub" ? -1 : 0;
      newOrder.push(item);
    }
    newOrder = newOrder.filter((item) => item.count > 0);
    setOrder({ ...order, order: newOrder });
    console.log("updateOrderList::", item, order, method);
  };

  const showAlertConfirm = (tilte: string, message: string) =>
    Alert.alert(
      tilte,
      message,
      [
        {
          text: t("cash"),
          onPress: () => {
            saveOrder("cash");
          },
          style: "default",
        },
        {
          text: t("transfer"),
          onPress: () => {
            saveOrder("transfer");
          },
          style: "default",
        },
      ],
      {
        cancelable: true,
      }
    );
  const refreshProductList = useRecoilCallback(
    ({ set }) =>
      async () => {
        try {
          const productData = await getAllItem(COLLECTION_IDS.products);

          // Cập nhật atom chứa tất cả sản phẩm
          set(allProductsAtom, productData);

          // Cập nhật từng sản phẩm trong atom family
          for (const product of productData) {
            set(productAtomFamily(product.$id), product);
          }
        } catch (error) {
          console.error("Error refreshing product list:", error);
        }
      },
    []
  );

  const saveOrder = async (orderStatus = "unpaid") => {
    console.log("saveOrder được gọi với status:", orderStatus);

    if (order) {
      try {
        setWaiting(true);
        console.log("Current order:", order);

        // Chuyển đổi mỗi item trong order thành chuỗi và tạo mảng chuỗi
        const orderStringArray = order.order.map((item) => {
          // Chỉ lấy các thông tin cần thiết để giảm kích thước
          const simpleItem = {
            $id: item.$id,
            name: item.name,
            price: item.price,
            count: item.count,
          };
          return JSON.stringify(simpleItem);
        });

        const data = {
          userId: userInfo.id,
          pushToken: userInfo.PUSH_TOKEN,
          order: orderStringArray,
          status: orderStatus,
          note: order.note,
          table:
            tables.length > 0 && selectedTableIndex.row > 0
              ? tables[selectedTableIndex.row - 1].name
              : null,
          subtract: order.subtract,
          location: order.location || "dine-in",
          discount: order.discount,
          date: order.date.toISOString(),
          total: finalPrice,
        };

        console.log("Data sẽ lưu:", data);

        let result;

        if (order.$id) {
          console.log("Cập nhật đơn hàng với ID:", order.$id);
          result = await updateItem(COLLECTION_IDS.orders, order.$id, data);
        } else {
          console.log("Tạo đơn hàng mới");
          result = await createItem(COLLECTION_IDS.orders, data);
        }

        // Nếu đơn hàng là paid (đã thanh toán), cập nhật số lượng tồn kho
        if (orderStatus === "cash" || orderStatus === "transfer") {
          // Cập nhật số lượng tồn kho cho từng sản phẩm
          for (const item of order.order) {
            const product = await getSingleItem(
              COLLECTION_IDS.products,
              item.$id
            );
            if (product) {
              const currentStock = product.stock || 0;
              const newStock = Math.max(0, currentStock - item.count);

              await updateItem(COLLECTION_IDS.products, item.$id, {
                stock: newStock,
              });

              // Kiểm tra nếu tồn kho thấp hơn ngưỡng, thông báo
              if (newStock <= (product.minStock || 0)) {
                // Hiển thị thông báo tồn kho thấp (có thể thêm thông báo push sau này)
                Alert.alert(
                  t("stock_alert"),
                  t("low_stock_message").replace("{product}", product.name),
                  [{ text: "OK" }]
                );
              }
            }
          }
        }
        await refreshProductList();
        console.log("Kết quả lưu đơn hàng:", result);

        if (result && result.$id) {
          console.log("Điều hướng đến ReceiptScreen");
          navigation.navigate("ReceiptScreen", { receiptData: result });
        } else {
          console.log("Không nhận được kết quả trả về hợp lệ");
        }
      } catch (error) {
        console.error("Lỗi trong saveOrder:", error);
        Alert.alert(t("error"), t("save_order_error"));
      } finally {
        setWaiting(false);
      }
    } else {
      console.log("Order không tồn tại hoặc không hợp lệ");
    }
  };

  const orderList = (item: OrderItem): React.ReactElement => (
    <Card
      key={item.$id}
      style={styles.cardItem as ViewStyle}
      onPress={() => {
        console.log("item pressed::", item);
      }}
    >
      <View style={styles.productCard as ViewStyle}>
        <ImageBackground
          style={styles.cardImg as ViewStyle}
          imageStyle={{ borderRadius: 8 }}
          source={
            item.photoUrl
              ? { uri: item.photoUrl }
              : require("../../assets/icons/food-default.png")
          }
          resizeMode="contain"
        ></ImageBackground>

        <View style={styles.cardInfo as ViewStyle}>
          <View style={{ paddingLeft: 10 }}>
            <Text style={{ paddingBottom: 10 }}> {item.name}</Text>
            <View
              style={{
                display: "flex",
                padding: 0,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderColor: "gray",
                borderWidth: 0.5,
                borderRadius: 5,
                height: 25,
                width: 90,
              }}
            >
              <Button
                appearance="ghost"
                style={styles.countBtn as ViewStyle}
                size="tiny"
                accessoryRight={() => (
                  <Icon
                    style={styles.countIcon}
                    fill="red"
                    name="minus-outline"
                  />
                )}
                onPress={() => updateOrderList(item, "sub")}
              ></Button>
              <Text style={{ textAlign: "center" }}>{item.count}</Text>
              <Button
                appearance="ghost"
                style={styles.countBtn as ViewStyle}
                size="tiny"
                accessoryRight={() => (
                  <Icon
                    style={styles.countIcon}
                    fill="green"
                    name="plus-outline"
                  />
                )}
                onPress={() => updateOrderList(item, "add")}
              ></Button>
            </View>
          </View>

          <Text style={{ height: 20 }}>
            {Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "VND",
            }).format(item.count * item.price)}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <Layout level="1" style={styles.container as ViewStyle}>
      <ScrollView>
        <View style={{ padding: 2 }}>
          {order && order.order && order.order.length > 0 ? (
            order.order.map((item) => orderList(item))
          ) : (
            <></>
          )}
        </View>
        <View
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "row-reverse",
          }}
        >
          <Button
            style={{ width: 100, margin: 10, borderWidth: 0 }}
            size="tiny"
            appearance="outline"
            status="primary"
            onPress={() =>
              RootNavigation.navigate("CreateOrderScreen", { method: "update" })
            }
          >
            {t("add_product")}
          </Button>
        </View>
        <Divider style={{ height: 5 }} />

        <View>
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              width: Dimensions.get("window").width - 10,
              // alignItems:"center"
              padding: 10,
            }}
          >
            <Text> {t("total_price")}</Text>
            <Text>
              {Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "VND",
              }).format(totalPrice)}
            </Text>
          </View>
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              width: Dimensions.get("window").width - 10,
              // alignItems:"center"
              padding: 10,
            }}
          >
            <Text> {t("subtract")}</Text>
            <Input
              {...useMaskedInputProps({
                value: order.subtract.toString(),
                onChangeText: (masked, unmasked) =>
                  setOrder({ ...order, subtract: parseInt(unmasked) }),
                mask: vndMask,
              })}
              size="small"
              style={{ width: 100 }}
              textAlign="right"
              placeholder={Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "VND",
              }).format(0)}
              keyboardType="numeric"
            />
          </View>
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              width: Dimensions.get("window").width - 10,
              // alignItems:"center"
              padding: 10,
            }}
          >
            <Text> {t("discount") + " (%)"}</Text>
            <Input
              placeholderTextColor={order.discount === null ? "red" : "gray"}
              value={order.discount ? order.discount.toString() : ""}
              size="small"
              style={{ width: 100 }}
              textAlign="right"
              placeholder="0 - 100"
              keyboardType="numeric"
              onChangeText={(nextValue) =>
                parseInt(nextValue) >= 0 && parseInt(nextValue) <= 100
                  ? setOrder({ ...order, discount: parseInt(nextValue) })
                  : setOrder({ ...order, discount: 0 })
              }
            />
          </View>
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              width: Dimensions.get("window").width - 10,
              // alignItems:"center"
              padding: 10,
            }}
          >
            <Text style={{ fontWeight: "bold" }}> {t("final_price")}</Text>
            <Text status="primary" style={{ fontWeight: "bold" }}>
              {Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "VND",
              }).format(finalPrice)}
            </Text>
          </View>
        </View>

        <Divider style={{ height: 5 }} />
        <View>
          <Select
            style={{ padding: 10 } as ViewStyle}
            label={t("choose_table")}
            placeholder={t("no_table_found")}
            value={
              tables.length > 0
                ? selectedTableIndex.row > 0
                  ? tables[selectedTableIndex.row - 1].name
                  : t("choose_table")
                : t("no_table_found") // thay null bằng giá trị string
            }
            selectedIndex={selectedTableIndex}
            onSelect={(index: IndexPath | IndexPath[]) => {
              if (index instanceof IndexPath) {
                setSelectedTableIndex(index);
              }
            }}
          >
            {tables.length > 0 ? (
              [{ name: t("choose_table"), $id: "0" }]
                .concat(tables)
                .map((table) => (
                  <SelectItem title={table.name} key={table.$id} />
                ))
            ) : (
              <></>
            )}
          </Select>
          {/* Sau phần Select bàn và trước phần nhập ghi chú */}
          <Select
            style={{ padding: 10 } as ViewStyle}
            label={t("order_location")}
            placeholder={t("choose_location")}
            value={
              order.location
                ? order.location === "dine-in"
                  ? t("dine_in")
                  : order.location === "take-away"
                    ? t("take_away")
                    : t("delivery")
                : t("choose_location")
            }
            selectedIndex={selectedLocationIndex}
            onSelect={(index: IndexPath | IndexPath[]) => {
              if (index instanceof IndexPath) {
                setSelectedLocationIndex(index);
                // Lưu loại vị trí vào order state
                const locationTypes = ["dine-in", "take-away", "delivery"];
                const locationType = locationTypes[index.row];
                setOrder({ ...order, location: locationType });
              }
            }}
          >
            <SelectItem title={t("dine_in")} />
            <SelectItem title={t("take_away")} />
            <SelectItem title={t("delivery")} />
          </Select>
          <Input
            label={t("order_note")}
            style={[styles.input as TextStyle, { padding: 10 }]}
            value={order.note}
            placeholder={t("order_note")}
            onChangeText={(nextValue) =>
              setOrder({ ...order, note: nextValue })
            }
          />

          <Datepicker
            style={[styles.input as ViewStyle, { padding: 10 }]}
            label={t("order_date")}
            date={order.date}
            max={new Date()}
            onSelect={(nextDate) => setOrder({ ...order, date: nextDate })}
            accessoryRight={(props) => <Icon {...props} name="calendar" />}
            dateService={
              new NativeDateService("vn", {
                i18n,
                startDayOfWeek: 0,
              })
            }
          />
        </View>
      </ScrollView>
      <Layout level="1" style={styles.buttons as ViewStyle}>
        <Button
          style={{ flex: 1, marginRight: 5, borderWidth: 0 }}
          appearance="outline"
          status="primary"
          onPress={() => saveOrder()}
        >
          {t("save_order")}
        </Button>
        <Button
          style={{
            flex: 1,
            marginLeft: 5,
            borderRadius: 8,
            backgroundColor: "#4caf50", // Màu xanh lá cố định thay vì dùng theme
            borderColor: "#388e3c",
            elevation: 3,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
          }}
          accessoryLeft={(props) => (
            <Icon {...props} fill="white" name="credit-card-outline" />
          )}
          onPress={() => showAlertConfirm(t("payment"), t("payment_msg"))}
        >
          {t("payment")}
        </Button>
      </Layout>
      <WaitingModal waiting={waiting} />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    paddingBottom: 100,
  },
  cardItem: {
    marginTop: 3,
    // marginBottom: 3,
  },
  productCard: {
    display: "flex",
    flexDirection: "row",
  },
  cardInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: Dimensions.get("window").width - 120,
  },
  cardImg: {
    aspectRatio: 1,
    width: 60,
    height: 60,
  },
  countBtn: {
    borderRadius: 5,
    height: 25,
  },
  countIcon: {
    width: 15,
    height: 15,
  },
  input: {
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "white",
    borderRadius: 0,
    // padding: 10
    // flex: 1,
  },
  buttons: {
    display: "flex",
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    padding: 10,
    paddingBottom: 30,
  },
});

export default ReviewOrderScreen;
