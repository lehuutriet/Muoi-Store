import React, { useEffect, useState, useRef, useCallback } from "react";
// import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { useRecoilState } from "recoil";
import { ScrollView, View, Dimensions, Alert } from "react-native";
import {
  StyleService,
  useStyleSheet,
  Layout,
  Icon,
  useTheme,
  Text,
  Button,
  Divider,
  Input,
  Card,
  Modal,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
// Thêm vào phần đầu file, trong phần import
import { COLLECTION_IDS, useAccounts, useDatabases } from "../hook/AppWrite";
import QRCode from "react-native-qrcode-svg";
import { useBLE } from "../hook/BLEContext";
import {} from "../utils";
import { default as EscPosEncoder } from "@waymen/esc-pos-encoder";
import ViewShot, { captureRef } from "react-native-view-shot";
import { userAtom } from "../states";
import { Buffer } from "buffer";
import { ViewStyle, ImageStyle, TextStyle } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useRecoilCallback } from "recoil";
import { allProductsAtom, productAtomFamily } from "../states";
// import ReactNativeBlobUtil from "react-native-blob-util";
type RootStackParamList = {
  TabNavigator: undefined;
  CreateOrderScreen: { method: string };
  ReviewOrderScreen: { orderInfo?: any };
  ReceiptScreen: { receiptData: any };
};

type ReceiptScreenProps = {
  route: RouteProp<RootStackParamList, "ReceiptScreen">;
  navigation: StackNavigationProp<RootStackParamList>;
};
interface ReceiptStyles {
  container: ViewStyle;
  productCard: ViewStyle;
  cardInfo: ViewStyle;
  cardImg: ImageStyle;
  headerRight: ViewStyle;
  menuIcon: ViewStyle;
  input: ViewStyle;
  countBtn: ViewStyle;
  countIcon: ImageStyle;
  buttons: ViewStyle;
  icon: ImageStyle;
}
interface ReceiptData {
  $id: string;
  status: string;
  date: string;
  table?: string;
  order: Array<{
    $id: string;
    name: string;
    price: number;
    count: number;
  }>;
  location?: string;
  subtract: number;
  discount: number;
}
const ReceiptScreen: React.FC<ReceiptScreenProps> = ({ route, navigation }) => {
  const viewShotRef = useRef(null);
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { printContent } = useBLE();
  const [mediaPermissionResponse, requestMediaPermission] =
    MediaLibrary.usePermissions();
  const [data, setReceiptData] = useState<ReceiptData | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [userInfo, setUserInfo] = useRecoilState(userAtom);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnReason, setReturnReason] = useState("");

  const [selectedItems, setSelectedItems] = useState<{
    [key: string]: boolean;
  }>({});
  const [returnAmount, setReturnAmount] = useState(0);
  const [currentReturnAmount, setCurrentReturnAmount] = useState(0);
  // Thêm useEffect để theo dõi khi selectedItems thay đổi
  useEffect(() => {
    if (data) {
      setReturnAmount(calculateReturnAmount());
    }
  }, [selectedItems, data]);
  // Thêm vào phần đầu của component ReceiptScreen
  const { updateItem, createItem, getSingleItem, getAllItem } = useDatabases();
  const [waiting, setWaiting] = useState(false);
  const toggleItemSelection = (index: any) => {
    const newSelectedItems = {
      ...selectedItems,
      [index]: !selectedItems[index],
    };

    setSelectedItems(newSelectedItems);

    // Tính lại giá trị hoàn trả ngay lập tức
    if (data && data.order) {
      const item = data.order[index];
      const itemValue = item.price * item.count;

      // Nếu đang chọn mới, thêm giá trị
      if (!selectedItems[index]) {
        setCurrentReturnAmount(currentReturnAmount + itemValue);
      }
      // Nếu đang bỏ chọn, trừ giá trị
      else {
        setCurrentReturnAmount(currentReturnAmount - itemValue);
      }
    }
  };

  // Sửa lại hàm showReturnOrderModal
  const showReturnOrderModal = () => {
    if (!data || !data.order) return;

    // Tạo đối tượng selectedItems với tất cả mục được chọn
    const newSelectedItems: { [key: number]: boolean } = {};
    data.order.forEach((_, index) => {
      newSelectedItems[index] = true;
    });

    setSelectedItems(newSelectedItems);
    setReturnReason("");

    // Tính tổng giá trị trực tiếp từ data
    let sum = 0;
    if (data.status === "cash" || data.status === "transfer") {
      data.order.forEach((item) => {
        sum += item.price * item.count;
      });
    }

    setCurrentReturnAmount(sum);
    setReturnModalVisible(true);
  };
  // Hàm tính toán giá trị hoàn trả
  const calculateReturnAmount = () => {
    let total = 0;

    if (!data || !data.order) return total;

    // Kiểm tra đơn hàng đã thanh toán chưa
    const isPaid = data.status === "cash" || data.status === "transfer";

    // Nếu chưa thanh toán, giá trị hoàn trả là 0
    if (!isPaid) {
      return 0;
    }

    // Nếu đã thanh toán, tính tổng giá trị các sản phẩm được chọn để hoàn trả
    Object.entries(selectedItems).forEach(([index, isSelected]) => {
      if (isSelected) {
        const item = data.order[parseInt(index)];
        total += item.price * item.count;
      }
    });

    return total;
  };
  // Thêm vào phần đầu của component ReceiptScreen
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
  const handleReturnOrder = async () => {
    if (!data) return;
    if (!returnReason) {
      Alert.alert("", t("please_provide_return_reason"));
      return;
    }

    setWaiting(true);

    try {
      // Kiểm tra trạng thái thanh toán

      const returnAmount = calculateReturnAmount();

      // Tạo dữ liệu để lưu thông tin đơn hàng bị hoàn trả
      const isPaid = data?.status === "cash" || data?.status === "transfer";
      const returnData = {
        originalOrderId: data?.$id,
        returnDate: new Date().toISOString(),
        returnReason: returnReason,
        returnedItems: data?.order
          .filter((_, index) => selectedItems[index])
          .map((item) => `${item.$id}:${item.count}`), // Lưu định dạng id:count
        totalReturnAmount: returnAmount,
        status: "returned",
        wasPaid: isPaid, // Đảm bảo là boolean (true/false), không phải null
      };

      // Cập nhật trạng thái đơn hàng gốc thành 'returned'
      await updateItem(COLLECTION_IDS.orders, data?.$id, {
        status: "returned",
        returnReason: returnReason,
        returnDate: new Date().toISOString(),
      });

      // Lưu thông tin chi tiết về việc hoàn trả
      await createItem(COLLECTION_IDS.returns, returnData);

      // Chỉ cập nhật lại tồn kho nếu đơn hàng đã thanh toán trước đó
      if (isPaid) {
        for (const [index, isSelected] of Object.entries(selectedItems)) {
          if (isSelected && data?.order[parseInt(index)]) {
            const item = data.order[parseInt(index)];
            const product = await getSingleItem(
              COLLECTION_IDS.products,
              item.$id
            );

            if (product) {
              const currentStock = product.stock || 0;
              const newStock = currentStock + item.count;

              await updateItem(COLLECTION_IDS.products, item.$id, {
                stock: newStock,
              });
            }
          }
        }
      }

      // Thông báo kết quả
      const successMessage = isPaid
        ? t("order_return_success_with_refund").replace(
            "{amount}",
            returnAmount.toLocaleString("vi-VN")
          )
        : t("order_return_success_no_refund");

      Alert.alert("", successMessage, [
        { text: t("ok"), onPress: () => navigation.goBack() },
      ]);
      await refreshProductList();
    } catch (error) {
      console.error("Lỗi khi hoàn trả đơn hàng:", error);
      Alert.alert("", t("order_return_error"));
    } finally {
      setWaiting(false);
      setReturnModalVisible(false);
    }
  };
  useEffect(() => {
    navigation.setOptions({
      title: t("receipt_detail"),
      headerRight: () => (
        <View style={styles.headerRight as ViewStyle}>
          <Button
            size="small"
            style={styles.menuIcon as ViewStyle}
            accessoryLeft={(props) => (
              <Icon
                {...props}
                fill={theme["color-primary-900"]}
                name="download"
              />
            )}
            appearance="outline"
            onPress={() => saveReceipt()}
          />
          <Button
            style={[styles.menuIcon as ViewStyle]}
            size="small"
            accessoryLeft={(props) => (
              <Icon {...props} fill={theme["color-primary-900"]} name="share" />
            )}
            appearance="outline"
            onPress={() => shareReceipt()}
          />
        </View>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    async function initData() {
      if (route.params && route.params.receiptData) {
        console.log("ReceiptScreen params::", route.params.receiptData);
        let receiptData = { ...route.params.receiptData };

        try {
          // Cách đơn giản nhất: Xử lý dữ liệu order cứng
          let orderItems = [];

          // Kiểm tra nếu là mảng
          if (Array.isArray(receiptData.order)) {
            for (let item of receiptData.order) {
              try {
                // Nếu là chuỗi, parse nó
                if (typeof item === "string") {
                  const parsedItem = JSON.parse(item);
                  // Đảm bảo các trường cần thiết tồn tại
                  orderItems.push({
                    $id: parsedItem.$id || `item-${Math.random()}`,
                    name: parsedItem.name || "Sản phẩm",
                    price: Number(parsedItem.price) || 0,
                    count: Number(parsedItem.count) || 1,
                  });
                } else if (typeof item === "object") {
                  // Nếu đã là object
                  orderItems.push({
                    $id: item.$id || `item-${Math.random()}`,
                    name: item.name || "Sản phẩm",
                    price: Number(item.price) || 0,
                    count: Number(item.count) || 1,
                  });
                }
              } catch (e) {
                console.error("Lỗi xử lý item:", e);
              }
            }
          } else if (typeof receiptData.order === "string") {
            // Nếu order là một chuỗi
            try {
              // Thử parse như một mảng JSON
              const parsedArray = JSON.parse(receiptData.order);
              if (Array.isArray(parsedArray)) {
                // Nếu parse thành công và là một mảng
                for (let item of parsedArray) {
                  orderItems.push({
                    $id: item.$id || `item-${Math.random()}`,
                    name: item.name || "Sản phẩm",
                    price: Number(item.price) || 0,
                    count: Number(item.count) || 1,
                  });
                }
              } else {
                // Nếu parse thành công nhưng không phải mảng
                orderItems.push({
                  $id: parsedArray.$id || `item-${Math.random()}`,
                  name: parsedArray.name || "Sản phẩm",
                  price: Number(parsedArray.price) || 0,
                  count: Number(parsedArray.count) || 1,
                });
              }
            } catch (e) {
              // Nếu không parse được như JSON, tạo một sản phẩm mẫu
              console.error("Lỗi parse order string:", e);
              orderItems.push({
                $id: "default-item",
                name: "Sản phẩm không xác định",
                price: 0,
                count: 1,
              });
            }
          }

          // Nếu không có sản phẩm nào được xử lý, thêm một sản phẩm mặc định
          if (orderItems.length === 0) {
            orderItems.push({
              $id: "default-item",
              name: "Sản phẩm mẫu",
              price: 1000,
              count: 1,
            });
          }

          // Gán lại vào receiptData
          receiptData.order = orderItems;
          console.log("Dữ liệu sản phẩm sau xử lý:", orderItems);
        } catch (e) {
          console.error("Lỗi toàn bộ quá trình:", e);
          // Nếu có lỗi, tạo dữ liệu mẫu
          receiptData.order = [
            {
              $id: "error-item",
              name: "Lỗi dữ liệu",
              price: 0,
              count: 1,
            },
          ];
        }

        // Xử lý các trường khác
        receiptData.subtract =
          receiptData.subtract >= 0 ? receiptData.subtract : 0;
        receiptData.discount =
          receiptData.discount >= 0 ? receiptData.discount : 0;
        setReceiptData(receiptData);

        // Tính toán giá trị
        try {
          let sum = 0;
          for (let item of receiptData.order) {
            sum += (item.price || 0) * (item.count || 1);
          }
          console.log("Tổng giá:", sum);
          setTotalPrice(sum);

          // Tính giá trừ giảm giá
          sum = receiptData.subtract > 0 ? sum - receiptData.subtract : sum;

          // Tính giá trừ chiết khấu phần trăm
          sum =
            receiptData.discount > 0
              ? sum - Math.round((sum * receiptData.discount) / 100)
              : sum;
          setFinalPrice(sum);
        } catch (e) {
          console.error("Lỗi tính toán giá:", e);
          setTotalPrice(0);
          setFinalPrice(0);
        }
      }
    }
    initData();
  }, []);

  const showAlert = (tilte: string, message: string) =>
    Alert.alert(
      tilte,
      message,
      [
        {
          text: "Ok",
          // onPress: () => Alert.alert('Cancel Pressed'),
          style: "cancel",
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

  const saveReceipt = async () => {
    // Save file to photo library
    const permission = await requestMediaPermission();
    console.log("permissionResponse::", permission);
    if (permission && permission.granted) {
      const receuptUri = await captureRef(viewShotRef, {
        width: 58,
        format: "jpg",
        quality: 0.5,
        result: "tmpfile",
      });
      console.log("receuptUri::", receuptUri);

      MediaLibrary.saveToLibraryAsync(receuptUri);
      showAlert("", t("save_receipt_success"));
    } else {
      showAlert("", t("permission_media_error"));
    }
  };

  const shareReceipt = async () => {
    const shareAvailable = await Sharing.isAvailableAsync();
    console.log("shareAvailable::", shareAvailable);
    if (shareAvailable) {
      const receuptUri = await captureRef(viewShotRef, {
        width: 58,
        format: "jpg",
        quality: 1,
        result: "tmpfile",
      });
      console.log("receuptUri::", receuptUri);
      Sharing.shareAsync(receuptUri);
    }
  };

  const printReceipt = async () => {
    if (!data) return;
    try {
      let encoder = new EscPosEncoder();
      const printStatus = await printContent(
        Buffer.from(encoder.newline().encode()).toString("base64")
      );
      if (printStatus) {
        const headerBuffer = encoder
          .initialize()
          .codepage("tcvn")
          .size(0)
          .align("center")
          .bold(true)
          .line(data.status === "unpaid" ? t("receipt_temp") : t("receipt"))
          .bold(false)
          .line(userInfo.STORE_NAME)
          .line(data.date)
          .line(
            (data.table ? t("table_num") + ": " + data.table : "") +
              " - " +
              (data.$id
                ? t("order_id") + ": " + data.$id.slice(data.$id.length - 4)
                : "")
          )
          .line("--------------------------------")
          .table(
            [
              { width: 8, marginRight: 2, align: "left" },
              { width: 8, align: "center" },
              { width: 1, align: "right" },
              { width: 10, marginLeft: 1, align: "right" },
            ],
            [
              /* Row one, with two columns */
              [t("product"), t("price"), t("quantity"), t("price_sum")],
            ]
          )
          .line("--------------------------------")
          .encode();
        await printContent(Buffer.from(headerBuffer).toString("base64"));
        for await (const [index, item] of data.order.entries()) {
          const buffer = encoder
            .codepage("tcvn")
            .table(
              [
                { width: 10, marginRight: 1, align: "left" },
                { width: 8, marginRight: 1, align: "right" },
                { width: 2, align: "right" },
                { width: 8, marginLeft: 2, align: "right" },
              ],
              [
                [
                  `${index + 1}. ${item.name}`,
                  Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "VND",
                  })
                    .format(item.price)
                    .slice(1),
                  `${item.count}`,
                  Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "VND",
                  })
                    .format(item.price * item.count)
                    .slice(1),
                ],
              ]
            )
            .encode();
          await printContent(Buffer.from(buffer).toString("base64"));
        }

        const footerBuffer = encoder
          .codepage("tcvn")
          .line("--------------------------------")
          .bold(true)
          .table(
            [
              { width: 16, align: "left" },
              { width: 16, align: "right" },
            ],
            [
              [
                t("total_price"),
                Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "VND",
                })
                  .format(totalPrice)
                  .slice(1),
              ],
            ]
          )
          .bold(false)
          .table(
            [
              { width: 16, align: "left" },
              { width: 16, align: "right" },
            ],
            [
              [t("subtract"), data.subtract.toString()],
              [`${t("discount")} %`, data.discount.toString()],
            ]
          )
          .bold(true)
          .table(
            [
              { width: 16, align: "left" },
              { width: 16, align: "right" },
            ],
            [
              [
                t("final_price"),
                Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "VND",
                })
                  .format(finalPrice)
                  .slice(1),
              ],
            ]
          )
          .bold(false)
          .line("--------------------------------")
          .table(
            [
              { width: 16, align: "left" },
              { width: 16, align: "right" },
            ],
            [[t("status"), data.status === "unpaid" ? t("unpaid") : t("paid")]]
          )
          .line("--------------------------------")
          .align("center")
          // .line(t("payment_method"))
          .line(userInfo.WIFI ? `${t("wifi")}: ${userInfo.WIFI}` : "")
          .line("--------------------------------")
          // .qrcode('https://nielsleenheer.com')
          .newline()
          .encode();

        await printContent(Buffer.from(footerBuffer).toString("base64"));
      }
    } catch (error) {
      console.log("error printing receipt::", error);
    }
  };

  return (
    <Layout level="1" style={styles.container as ViewStyle}>
      <ScrollView>
        {data ? (
          <ViewShot
            ref={viewShotRef}
            style={{
              paddingLeft: 16,
              paddingRight: 16,
              paddingBottom: 16,
              backgroundColor: "white",
            }}
          >
            <View>
              <View
                style={{
                  padding: 10,
                }}
              >
                <Text
                  style={{
                    fontWeight: "bold",
                    textAlign: "center",
                    fontSize: 18,
                  }}
                >
                  {data.status === "unpaid" ? t("receipt") : t("receipt_temp")}
                </Text>
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 15,
                  }}
                >
                  {userInfo.STORE_NAME}
                </Text>
                <Text style={{ textAlign: "center", fontSize: 12 }}>
                  {data.date
                    ? new Date(data.date).toLocaleString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </Text>
                <Text style={{ textAlign: "center", fontSize: 12 }}>
                  {(data.table ? t("table_num") + ": " + data.table : "") +
                    " - " +
                    (data.$id
                      ? t("order_id") +
                        ": " +
                        data.$id.slice(data.$id.length - 4)
                      : "")}
                </Text>
              </View>
            </View>
            <Divider
              style={{
                borderStyle: "dashed",
                borderTopWidth: 2,
                backgroundColor: "transparent",
                borderColor: theme["color-basic-700"],
              }}
            ></Divider>
            <View
              style={{
                display: "flex",
                width: "100%",
                flexDirection: "row",
                paddingTop: 10,
                paddingBottom: 10,
                // width: Dimensions.get("window").width - 32,
                // alignItems:"center",
              }}
            >
              <Text style={{ flex: 3 }}> {t("product")}</Text>
              <Text style={{ flex: 2, textAlign: "center" }}>
                {" "}
                {t("price_single")}
              </Text>
              <Text style={{ flex: 1, textAlign: "center" }}>
                {t("quantity")}
              </Text>
              <Text style={{ flex: 2, textAlign: "right" }}>
                {t("price_sum")}
              </Text>
            </View>
            <Divider
              style={{ height: 1, backgroundColor: theme["color-basic-700"] }}
            ></Divider>
            <View
              style={{
                paddingTop: 10,
                paddingBottom: 10,
              }}
            >
              {data.order && data.order.length > 0 ? (
                data.order.map((item, index) => (
                  <View
                    key={item.$id}
                    style={{
                      display: "flex",
                      width: "100%",
                      flexDirection: "row",
                      // width: Dimensions.get("window").width - 32,
                      // alignItems:"center",
                    }}
                  >
                    <Text style={{ flex: 3 }}>
                      {index + 1}. {item.name}
                    </Text>
                    <Text style={{ flex: 2, textAlign: "center" }}>
                      {Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "VND",
                      }).format(item.price)}
                    </Text>
                    <Text style={{ flex: 1, textAlign: "center" }}>
                      x{item.count}
                    </Text>
                    <Text style={{ flex: 2, textAlign: "right" }}>
                      {Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "VND",
                      }).format(item.count * item.price)}
                    </Text>
                  </View>
                ))
              ) : (
                <></>
              )}
            </View>

            <Divider
              style={{
                borderStyle: "dashed",
                borderTopWidth: 2,
                backgroundColor: "transparent",
                borderColor: theme["color-basic-700"],
              }}
            ></Divider>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 10,
                paddingBottom: 10,
                // width: Dimensions.get("window").width - 32,
                // alignItems:"center",
              }}
            >
              <Text style={{ fontWeight: "bold" }}>{t("total_price")} </Text>
              <Text style={{ fontWeight: "bold" }}>
                {Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "VND",
                }).format(totalPrice)}{" "}
              </Text>
            </View>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 5,
              }}
            >
              <Text>{t("order_location")}</Text>
              <Text>
                {data.location
                  ? data.location === "dine-in"
                    ? t("dine_in")
                    : data.location === "take-away"
                      ? t("take_away")
                      : t("delivery")
                  : t("dine_in")}{" "}
                {/* Mặc định là tại quán */}
              </Text>
            </View>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 10,
                // width: Dimensions.get("window").width - 32,
                // alignItems:"center",
              }}
            >
              <Text>{t("subtract")} </Text>
              <Text>
                {Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "VND",
                }).format(data.subtract ? data.subtract : 0)}
              </Text>
            </View>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 10,
                // width: Dimensions.get("window").width - 32,
                // alignItems:"center",
              }}
            >
              <Text>{t("discount") + " " + data.discount + "%"}</Text>
              <Text>
                {Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "VND",
                }).format(
                  Math.round(
                    ((totalPrice - data.subtract) * data.discount) / 100
                  )
                )}
              </Text>
            </View>

            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 10,
                paddingBottom: 10,
                // width: Dimensions.get("window").width - 32,
                // alignItems:"center",
              }}
            >
              <Text style={{ fontWeight: "bold" }}>{t("final_price")}</Text>
              <Text style={{ fontWeight: "bold" }}>
                {Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "VND",
                }).format(finalPrice)}
              </Text>
            </View>

            <Divider
              style={{
                borderStyle: "dashed",
                borderTopWidth: 2,
                backgroundColor: "transparent",
                borderColor: theme["color-basic-700"],
              }}
            ></Divider>
            <View
              style={{
                marginTop: 10,
                marginBottom: 10,
                backgroundColor: theme["color-primary-100"],
                borderRadius: 12,
                padding: 15,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Icon
                  style={{ width: 20, height: 20, marginRight: 8 }}
                  fill={theme["color-primary-500"]}
                  name="credit-card-outline"
                />
                <Text
                  category="s1"
                  style={{
                    textAlign: "center",
                    fontWeight: "bold",
                    color: theme["color-primary-600"],
                  }}
                >
                  {data.status === "cash"
                    ? t("cash")
                    : data.status === "transfer"
                      ? t("transfer")
                      : t("payment_method")}
                </Text>
              </View>

              {userInfo.WIFI && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "white",
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 5,
                  }}
                >
                  <Icon
                    style={{ width: 16, height: 16, marginRight: 8 }}
                    fill={theme["color-success-500"]}
                    name="wifi-outline"
                  />
                  <Text
                    style={{
                      textAlign: "center",
                      fontSize: 14,
                      color: theme["color-basic-800"],
                    }}
                  >
                    {`${t("wifi")}: ${userInfo.WIFI}`}
                  </Text>
                </View>
              )}
            </View>
            <Divider
              style={{
                borderStyle: "dashed",
                borderTopWidth: 2,
                backgroundColor: "transparent",
                borderColor: theme["color-basic-700"],
              }}
            ></Divider>
            <View
              style={{
                display: "flex",
                alignItems: "center",
                paddingTop: 20,
              }}
            >
              <QRCode
                size={150}
                value={data.$id}
                // logo={{uri: base64Logo}}
                // logoSize={20}
                logoBackgroundColor="transparent"
              />
            </View>
          </ViewShot>
        ) : (
          <></>
        )}
      </ScrollView>
      // Thêm nút hủy đơn trong ReceiptScreen.tsx
      <Layout level="1" style={styles.buttons as ViewStyle}>
        <Button
          style={{ flex: 1, marginRight: 5, borderWidth: 0 }}
          appearance="outline"
          status="primary"
          onPress={() => printReceipt()}
          accessoryLeft={() => (
            <Icon
              style={styles.icon}
              fill={theme["color-primary-500"]}
              name="printer"
            />
          )}
        >
          {t("print_receipt")}
        </Button>

        {/* Thêm nút hủy đơn hàng */}
        <Button
          style={{ flex: 1, marginRight: 5, borderWidth: 0 }}
          appearance="outline"
          status="danger"
          onPress={() => showReturnOrderModal()}
          accessoryLeft={() => (
            <Icon
              style={styles.icon}
              fill={theme["color-danger-500"]}
              name="close-circle-outline"
            />
          )}
        >
          {t("return_order")}
        </Button>

        <Button
          style={{ flex: 1, marginLeft: 5 }}
          onPress={() => {
            navigation.reset({
              index: 1,
              routes: [
                { name: "TabNavigator" },
                { name: "CreateOrderScreen", params: { method: "create" } },
              ],
            });
          }}
        >
          {t("create_new_order")}
        </Button>
      </Layout>
      <Modal
        visible={returnModalVisible}
        backdropStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        onBackdropPress={() => setReturnModalVisible(false)}
        style={{ width: "90%" }}
      >
        <Card>
          <Text category="h6" style={{ marginBottom: 16, textAlign: "center" }}>
            {t("return_order")}
          </Text>

          <Text category="s1" style={{ marginBottom: 8 }}>
            {t("select_return_items")}:
          </Text>

          <ScrollView style={{ maxHeight: 200 }}>
            {data?.order.map((item, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Button
                  appearance={selectedItems[index] ? "filled" : "outline"}
                  status="primary"
                  size="tiny"
                  onPress={() => toggleItemSelection(index)}
                  accessoryLeft={(props) => (
                    <Icon
                      {...props}
                      name={
                        selectedItems[index]
                          ? "checkmark-square-outline"
                          : "square-outline"
                      }
                    />
                  )}
                  style={{ marginRight: 8 }}
                />
                <Text>
                  {item.name} x{item.count}
                </Text>
              </View>
            ))}
          </ScrollView>

          <Input
            label={t("return_reason")}
            placeholder={t("enter_return_reason")}
            value={returnReason}
            onChangeText={setReturnReason}
            multiline
            textStyle={{ minHeight: 64 }}
            style={{ marginVertical: 16 }}
          />

          <Text category="s1" style={{ marginBottom: 8 }}>
            {t("total_return_amount")}:{" "}
            {data && (data.status === "cash" || data.status === "transfer")
              ? Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(currentReturnAmount)
              : t("unpaid_no_refund")}
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 16,
            }}
          >
            <Button
              status="basic"
              onPress={() => setReturnModalVisible(false)}
              style={{ flex: 1, marginRight: 8 }}
            >
              {t("cancel")}
            </Button>
            <Button
              status="danger"
              onPress={handleReturnOrder}
              style={{ flex: 1 }}
            >
              {t("confirm_return")}
            </Button>
          </View>
        </Card>
      </Modal>
    </Layout>
  );
};

const styleSheet = StyleService.create<ReceiptStyles>({
  container: {
    flex: 1,
    paddingBottom: 100,
  },
  productCard: {
    display: "flex",
    flexDirection: "row",
  },
  cardInfo: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    width: Dimensions.get("window").width - 100,
    alignItems: "center",
  },
  cardImg: {
    aspectRatio: 1,
    margin: 20,
    width: 45,
    height: 45,
  },
  headerRight: {
    display: "flex",
    flexDirection: "row",
  },
  menuIcon: {
    backgroundColor: "transparent",
    borderWidth: 0,
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

  countBtn: { backgroundColor: "transparent", borderWidth: 0 },
  countIcon: {
    width: 20,
    height: 20,
  },
  buttons: {
    display: "flex",
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    padding: 10,
    paddingBottom: 30,
  },
  icon: {
    width: 20,
    height: 20,
  },
});

export default ReceiptScreen;
