import React, { useEffect, useState, useRef, useCallback } from "react";
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
  Spinner,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { COLLECTION_IDS, useAccounts, useDatabases } from "../hook/AppWrite";
import QRCode from "react-native-qrcode-svg";
import { useBLE } from "../hook/BLEContext";
import { default as EscPosEncoder } from "@waymen/esc-pos-encoder";
import ViewShot, { captureRef } from "react-native-view-shot";
import { userAtom } from "../states";
import { Buffer } from "buffer";
import { ViewStyle, ImageStyle, TextStyle } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useRecoilCallback } from "recoil";
import { allProductsAtom, productAtomFamily } from "../states";

const { width, height } = Dimensions.get("window");

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
  receiptContainer: ViewStyle;
  receiptHeader: ViewStyle;
  receiptTitle: TextStyle;
  storeName: TextStyle;
  receiptDateTime: TextStyle;
  tableInfo: TextStyle;
  divider: ViewStyle;
  dashedDivider: ViewStyle;
  columnHeader: ViewStyle;
  columnHeaderText: TextStyle;
  itemRow: ViewStyle;
  itemName: TextStyle;
  itemPrice: TextStyle;
  itemQuantity: TextStyle;
  itemTotal: TextStyle;
  summaryContainer: ViewStyle;
  summaryRow: ViewStyle;
  summaryLabel: TextStyle;
  summaryValue: TextStyle;
  finalPriceRow: ViewStyle;
  finalPriceLabel: TextStyle;
  finalPriceValue: TextStyle;
  paymentMethodContainer: ViewStyle;
  paymentMethodHeader: ViewStyle;
  paymentMethodIcon: ImageStyle;
  paymentMethodText: TextStyle;
  wifiContainer: ViewStyle;
  wifiInfo: TextStyle;
  qrCodeContainer: ViewStyle;
  thankYouText: TextStyle;
  buttonsContainer: ViewStyle;
  actionButton: ViewStyle;
  buttonIcon: ImageStyle;
  modalCard: ViewStyle;
  modalTitle: TextStyle;
  returnItemContainer: ViewStyle;
  returnItemCheckbox: ViewStyle;
  returnReasonInput: ViewStyle;
  returnAmountText: TextStyle;
  modalButtonsContainer: ViewStyle;
  modalButton: ViewStyle;
  headerRight: ViewStyle;
  menuIcon: ViewStyle;
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
  couponCode?: string;
  couponDiscount?: number;
  customerName?: string;
  customerPhone?: string;
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
  const [waiting, setWaiting] = useState(false);

  const [appliedPromotion, setAppliedPromotion] = useState<any>(null);
  const { updateItem, createItem, getSingleItem, getAllItem } = useDatabases();
  const [promotionName, setPromotionName] = useState("");
  const [promotionDiscount, setPromotionDiscount] = useState(0);
  // Theo dõi khi selectedItems thay đổi
  useEffect(() => {
    if (data) {
      setReturnAmount(calculateReturnAmount());
    }
  }, [selectedItems, data]);

  // Refresh danh sách sản phẩm
  const refreshProductList = useRecoilCallback(
    ({ set }) =>
      async () => {
        try {
          const productData = await getAllItem(COLLECTION_IDS.products);
          set(allProductsAtom, productData);
          for (const product of productData) {
            set(productAtomFamily(product.$id), product);
          }
        } catch (error) {
          console.error("Lỗi khi làm mới danh sách sản phẩm:", error);
        }
      },
    []
  );

  // Chọn/bỏ chọn mục khi hoàn trả
  const toggleItemSelection = (index: number) => {
    const newSelectedItems = {
      ...selectedItems,
      [index]: !selectedItems[index],
    };

    setSelectedItems(newSelectedItems);

    if (data && data.order) {
      const item = data.order[index];
      const itemValue = item.price * item.count;

      if (!selectedItems[index]) {
        setCurrentReturnAmount(currentReturnAmount + itemValue);
      } else {
        setCurrentReturnAmount(currentReturnAmount - itemValue);
      }
    }
  };

  // Tính toán số tiền hoàn trả
  const calculateReturnAmount = () => {
    let total = 0;

    if (!data || !data.order) return total;

    const isPaid = data.status === "cash" || data.status === "transfer";
    if (!isPaid) return 0;

    Object.entries(selectedItems).forEach(([index, isSelected]) => {
      if (isSelected) {
        const item = data.order[parseInt(index)];
        total += item.price * item.count;
      }
    });

    return total;
  };

  // Hiển thị modal hoàn trả đơn hàng
  const showReturnOrderModal = () => {
    if (!data || !data.order) return;

    const newSelectedItems: { [key: number]: boolean } = {};
    data.order.forEach((_, index) => {
      newSelectedItems[index] = true;
    });

    setSelectedItems(newSelectedItems);
    setReturnReason("");

    let sum = 0;
    if (data.status === "cash" || data.status === "transfer") {
      data.order.forEach((item) => {
        sum += item.price * item.count;
      });
    }

    setCurrentReturnAmount(sum);
    setReturnModalVisible(true);
  };

  // Xử lý hoàn trả đơn hàng
  const handleReturnOrder = async () => {
    if (!data) return;
    if (!returnReason) {
      Alert.alert("", t("please_provide_return_reason"));
      return;
    }

    setWaiting(true);

    try {
      const returnAmount = calculateReturnAmount();
      const isPaid = data?.status === "cash" || data?.status === "transfer";

      const returnData = {
        originalOrderId: data?.$id,
        returnDate: new Date().toISOString(),
        returnReason: returnReason,
        returnedItems: data?.order
          .filter((_, index) => selectedItems[index])
          .map((item) => `${item.$id}:${item.count}`),
        totalReturnAmount: returnAmount,
        status: "returned",
        wasPaid: isPaid,
      };

      await updateItem(COLLECTION_IDS.orders, data?.$id, {
        status: "returned",
        returnReason: returnReason,
        returnDate: new Date().toISOString(),
      });

      await createItem(COLLECTION_IDS.returns, returnData);

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

  // Cài đặt thanh tiêu đề
  useEffect(() => {
    navigation.setOptions({
      title: t("receipt_detail"),
      headerRight: () => (
        <View style={styles.headerRight as any}>
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
            style={styles.menuIcon as ViewStyle}
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

  // Khởi tạo dữ liệu hóa đơn
  useEffect(() => {
    async function initData() {
      if (route.params && route.params.receiptData) {
        console.log("ReceiptScreen params::", route.params.receiptData);
        let receiptData = { ...route.params.receiptData };

        try {
          let orderItems = [];

          if (Array.isArray(receiptData.order)) {
            for (let item of receiptData.order) {
              try {
                if (typeof item === "string") {
                  const parsedItem = JSON.parse(item);
                  orderItems.push({
                    $id: parsedItem.$id || `item-${Math.random()}`,
                    name: parsedItem.name || "Sản phẩm",
                    price: Number(parsedItem.price) || 0,
                    count: Number(parsedItem.count) || 1,
                  });
                } else if (typeof item === "object") {
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
            try {
              const parsedArray = JSON.parse(receiptData.order);
              if (Array.isArray(parsedArray)) {
                for (let item of parsedArray) {
                  orderItems.push({
                    $id: item.$id || `item-${Math.random()}`,
                    name: item.name || "Sản phẩm",
                    price: Number(item.price) || 0,
                    count: Number(item.count) || 1,
                  });
                }
              } else {
                orderItems.push({
                  $id: parsedArray.$id || `item-${Math.random()}`,
                  name: parsedArray.name || "Sản phẩm",
                  price: Number(parsedArray.price) || 0,
                  count: Number(parsedArray.count) || 1,
                });
              }
            } catch (e) {
              console.error("Lỗi parse order string:", e);
              orderItems.push({
                $id: "default-item",
                name: "Sản phẩm không xác định",
                price: 0,
                count: 1,
              });
            }
          }

          if (orderItems.length === 0) {
            orderItems.push({
              $id: "default-item",
              name: "Sản phẩm mẫu",
              price: 1000,
              count: 1,
            });
          }

          receiptData.order = orderItems;
          receiptData.subtract =
            receiptData.subtract >= 0 ? receiptData.subtract : 0;
          receiptData.discount =
            receiptData.discount >= 0 ? receiptData.discount : 0;
          receiptData.couponDiscount =
            receiptData.couponDiscount >= 0 ? receiptData.couponDiscount : 0;
          receiptData.couponCode = receiptData.couponCode || "";
          // Thêm dòng này để đọc thông tin khuyến mãi
          receiptData.promotionDiscount =
            receiptData.promotionDiscount >= 0
              ? receiptData.promotionDiscount
              : 0;

          // Cập nhật state từ dữ liệu đơn hàng
          if (receiptData.promotionDiscount > 0) {
            setPromotionDiscount(receiptData.promotionDiscount);
            // Nếu có promotionId và promotionName, có thể tạo đối tượng appliedPromotion
            if (receiptData.promotionId || receiptData.promotionName) {
              setAppliedPromotion({
                $id: receiptData.promotionId || "",
                name: receiptData.promotionName || "Khuyến mãi",
              });
            }
          }

          setReceiptData(receiptData);

          try {
            // Tính tổng giá tiền ban đầu
            let sum = 0;
            for (let item of receiptData.order) {
              sum += (item.price || 0) * (item.count || 1);
            }
            // Xử lý thông tin đặc biệt về khuyến mãi
            if (receiptData.promotionName) {
              setPromotionName(receiptData.promotionName);
            }

            if (
              receiptData.promotionDiscount &&
              receiptData.promotionDiscount > 0
            ) {
              setPromotionDiscount(Number(receiptData.promotionDiscount));
            }
            setTotalPrice(sum);

            // Tính giá cuối cùng
            let finalSum = sum;
            if (receiptData.subtract > 0) {
              finalSum = finalSum - receiptData.subtract;
            }

            if (receiptData.couponDiscount > 0) {
              finalSum = finalSum - receiptData.couponDiscount;
            }

            // Thêm phần trừ khuyến mãi vào tính toán giá cuối
            if (receiptData.promotionDiscount > 0) {
              finalSum = finalSum - Number(receiptData.promotionDiscount);
            }

            if (receiptData.discount > 0) {
              finalSum =
                finalSum - Math.round((finalSum * receiptData.discount) / 100);
            }

            setFinalPrice(Math.max(0, finalSum));
          } catch (e) {
            console.error("Lỗi tính toán giá:", e);
            setTotalPrice(0);
            setFinalPrice(0);
          }
        } catch (e) {
          console.error("Lỗi toàn bộ quá trình:", e);
          // [Xử lý lỗi]
        }
      }
    }
    initData();
  }, []);

  const showAlert = (tilte: string, message: string) =>
    Alert.alert(tilte, message, [{ text: "Ok", style: "cancel" }], {
      cancelable: true,
    });

  // Lưu hóa đơn vào thư viện ảnh
  const saveReceipt = async () => {
    const permission = await requestMediaPermission();
    console.log("permissionResponse::", permission);
    if (permission && permission.granted) {
      const receiptUri = await captureRef(viewShotRef, {
        width: 58,
        format: "jpg",
        quality: 0.8,
        result: "tmpfile",
      });
      console.log("receiptUri::", receiptUri);

      MediaLibrary.saveToLibraryAsync(receiptUri);
      showAlert("", t("save_receipt_success"));
    } else {
      showAlert("", t("permission_media_error"));
    }
  };

  // Chia sẻ hóa đơn
  const shareReceipt = async () => {
    const shareAvailable = await Sharing.isAvailableAsync();
    console.log("shareAvailable::", shareAvailable);
    if (shareAvailable) {
      const receiptUri = await captureRef(viewShotRef, {
        width: 58,
        format: "jpg",
        quality: 1,
        result: "tmpfile",
      });
      console.log("receiptUri::", receiptUri);
      Sharing.shareAsync(receiptUri);
    }
  };

  // In hóa đơn
  // In hóa đơn
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

        // Xây dựng bảng tính tiền
        let summaryTable = [
          [
            t("total_price"),
            Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "VND",
            })
              .format(totalPrice)
              .slice(1),
          ],
        ];

        // Thêm dòng trừ tiền trực tiếp nếu có
        if (data.subtract > 0) {
          summaryTable.push([
            t("subtract"),
            "-" +
              Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "VND",
              })
                .format(data.subtract)
                .slice(1),
          ]);
        }

        // Thêm dòng giảm giá từ mã khuyến mãi nếu có
        if (data.couponCode && data.couponDiscount && data.couponDiscount > 0) {
          summaryTable.push([
            `${t("coupon")} (${data.couponCode})`,
            "-" +
              Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "VND",
              })
                .format(data.couponDiscount)
                .slice(1),
          ]);
        }

        // Thêm dòng giảm giá từ khuyến mãi nếu có
        if (promotionDiscount > 0) {
          const promotionText = appliedPromotion?.name
            ? `${t("promotion")} (${appliedPromotion.name})`
            : t("promotion");

          summaryTable.push([
            promotionText,
            "-" +
              Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "VND",
              })
                .format(promotionDiscount)
                .slice(1),
          ]);
        }

        // Thêm dòng giảm giá phần trăm nếu có
        if (data.discount > 0) {
          summaryTable.push([`${t("discount")} (%)`, `${data.discount}%`]);
        }

        const footerBuffer = encoder
          .codepage("tcvn")
          .line("--------------------------------")
          .bold(true)
          // In bảng tính tiền
          .table(
            [
              { width: 16, align: "left" },
              { width: 16, align: "right" },
            ],
            summaryTable
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
          .line(userInfo.WIFI ? `${t("wifi")}: ${userInfo.WIFI}` : "")
          .line("--------------------------------")
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {data ? (
          <ViewShot
            ref={viewShotRef}
            style={styles.receiptContainer as ViewStyle}
          >
            {/* Header */}
            <View style={styles.receiptHeader as ViewStyle}>
              <Text category="h5" style={styles.receiptTitle as TextStyle}>
                {data.status === "unpaid" ? t("receipt_temp") : t("receipt")}
              </Text>
              <Text category="h6" style={styles.storeName as TextStyle}>
                {userInfo.STORE_NAME}
              </Text>
              <Text category="s2" style={styles.receiptDateTime as TextStyle}>
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

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginTop: 4,
                }}
              >
                <Text category="s2" style={styles.tableInfo as TextStyle}>
                  {data.table ? `${t("table_num")}: ${data.table}` : ""}
                  {data.table && data.$id ? " • " : ""}
                  {data.$id
                    ? `${t("order_id")}: #${data.$id.slice(data.$id.length - 4)}`
                    : ""}
                </Text>
              </View>

              {/* Thông tin khách hàng nếu có */}
              {data.customerName && (
                <View
                  style={{
                    marginTop: 12,
                    backgroundColor: theme["color-primary-100"],
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    category="s1"
                    style={{
                      textAlign: "center",
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    {t("customer_information")}
                  </Text>
                  <Text style={{ textAlign: "center" }}>
                    {data.customerName}
                  </Text>
                  {data.customerPhone && (
                    <Text style={{ textAlign: "center" }}>
                      {data.customerPhone}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <Divider style={styles.dashedDivider as ViewStyle} />

            {/* Column Headers */}
            <View style={styles.columnHeader as ViewStyle}>
              <Text
                category="s1"
                style={
                  [styles.columnHeaderText, { flex: 3 }] as unknown as TextStyle
                }
              >
                {t("product")}
              </Text>
              <Text
                category="s1"
                style={
                  {
                    ...styles.columnHeaderText,
                    flex: 2,
                    textAlign: "center",
                  } as TextStyle
                }
              >
                {t("price_single")}
              </Text>
              <Text
                category="s1"
                style={
                  {
                    ...styles.columnHeaderText,
                    flex: 1,
                    textAlign: "center",
                  } as TextStyle
                }
              >
                {t("quantity")}
              </Text>
              <Text
                category="s1"
                style={
                  {
                    ...styles.columnHeaderText,
                    flex: 2,
                    textAlign: "right",
                  } as TextStyle
                }
              >
                {t("price_sum")}
              </Text>
            </View>

            <Divider style={styles.divider as ViewStyle} />

            {/* Items */}
            <View style={{ paddingVertical: 10 }}>
              {data.order && data.order.length > 0 ? (
                data.order.map((item, index) => (
                  <View key={item.$id} style={styles.itemRow as ViewStyle}>
                    <Text category="p1" style={styles.itemName as TextStyle}>
                      {index + 1}. {item.name}
                    </Text>
                    <Text category="p1" style={styles.itemPrice as TextStyle}>
                      {Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(item.price)}
                    </Text>
                    <Text
                      category="p1"
                      style={styles.itemQuantity as TextStyle}
                    >
                      x{item.count}
                    </Text>
                    <Text category="p1" style={styles.itemTotal as TextStyle}>
                      {Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(item.count * item.price)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text
                  style={
                    {
                      textAlign: "center",
                      padding: 20,
                      color: theme["color-basic-600"],
                    } as TextStyle
                  }
                >
                  {t("no_items")}
                </Text>
              )}
            </View>

            <Divider style={styles.dashedDivider as ViewStyle} />

            {/* Summary */}
            <View style={styles.summaryContainer as ViewStyle}>
              <View style={styles.summaryRow as ViewStyle}>
                <Text category="s1" style={styles.summaryLabel as TextStyle}>
                  {t("total_price")}
                </Text>
                <Text category="s1" style={styles.summaryValue as TextStyle}>
                  {Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(totalPrice)}
                </Text>
              </View>

              {data.subtract > 0 && (
                <View style={styles.summaryRow as ViewStyle}>
                  <Text style={styles.summaryLabel as TextStyle}>
                    {t("subtract")}
                  </Text>
                  <Text style={styles.summaryValue as TextStyle}>
                    -{" "}
                    {Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(data.subtract)}
                  </Text>
                </View>
              )}

              {data.couponCode && (
                <View style={styles.summaryRow as ViewStyle}>
                  <Text style={styles.summaryLabel as TextStyle}>
                    {t("coupon")} ({data.couponCode || ""})
                  </Text>
                  <Text style={styles.summaryValue as TextStyle}>
                    -{" "}
                    {Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(data.couponDiscount || 0)}
                  </Text>
                </View>
              )}

              {data.discount > 0 && (
                <View style={styles.summaryRow as ViewStyle}>
                  <Text style={styles.summaryLabel as TextStyle}>
                    {t("discount")} (%)
                  </Text>
                  <Text style={styles.summaryValue as TextStyle}>
                    {data.discount}%
                  </Text>
                </View>
              )}

              {appliedPromotion && promotionDiscount > 0 && (
                <View style={styles.summaryRow as ViewStyle}>
                  <Text style={styles.summaryLabel as TextStyle}>
                    {t("promotion")} ({appliedPromotion.name || ""})
                  </Text>
                  <Text style={styles.summaryValue as TextStyle}>
                    -{" "}
                    {Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(promotionDiscount)}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow as ViewStyle}>
                <Text style={styles.summaryLabel as TextStyle}>
                  {t("order_location")}
                </Text>
                <Text style={styles.summaryValue as TextStyle}>
                  {data.location
                    ? data.location === "dine-in"
                      ? t("dine_in")
                      : data.location === "take-away"
                        ? t("take_away")
                        : t("delivery")
                    : t("dine_in")}
                </Text>
              </View>

              <View style={styles.finalPriceRow as ViewStyle}>
                <Text category="h6" style={styles.finalPriceLabel as TextStyle}>
                  {t("final_price")}
                </Text>
                <Text category="h6" style={styles.finalPriceValue as TextStyle}>
                  {Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(finalPrice)}
                </Text>
              </View>
            </View>

            <Divider style={styles.dashedDivider as ViewStyle} />

            {/* Payment Method */}
            <View style={styles.paymentMethodContainer as ViewStyle}>
              <View style={styles.paymentMethodHeader as ViewStyle}>
                <Icon
                  style={styles.paymentMethodIcon}
                  fill={theme["color-primary-500"]}
                  name="credit-card-outline"
                />
                <Text
                  category="s1"
                  style={styles.paymentMethodText as TextStyle}
                >
                  {data.status === "cash"
                    ? t("cash")
                    : data.status === "transfer"
                      ? t("transfer")
                      : t("unpaid")}
                </Text>
              </View>

              {userInfo.WIFI && (
                <View style={styles.wifiContainer as ViewStyle}>
                  <Icon
                    style={{ width: 16, height: 16, marginRight: 8 }}
                    fill={theme["color-success-500"]}
                    name="wifi-outline"
                  />
                  <Text style={styles.wifiInfo as TextStyle}>
                    {`${t("wifi")}: ${userInfo.WIFI}`}
                  </Text>
                </View>
              )}
            </View>

            <Divider style={styles.dashedDivider as ViewStyle} />

            {/* QR Code */}
            <View style={styles.qrCodeContainer as ViewStyle}>
              <QRCode
                size={150}
                value={data.$id}
                logoBackgroundColor="transparent"
              />
              <Text style={styles.thankYouText as TextStyle}>
                {t("thank_you_for_purchase")}
              </Text>
            </View>
          </ViewShot>
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
          >
            <Spinner size="large" />
            <Text category="s1" style={{ marginTop: 16 }}>
              {t("loading_receipt")}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <Layout level="1" style={styles.buttonsContainer as ViewStyle}>
        <Button
          style={styles.actionButton as ViewStyle}
          appearance="outline"
          status="primary"
          onPress={() => printReceipt()}
          accessoryLeft={() => (
            <Icon
              style={styles.buttonIcon}
              fill={theme["color-primary-500"]}
              name="printer-outline"
            />
          )}
        >
          {t("print_receipt")}
        </Button>

        <Button
          style={styles.actionButton as ViewStyle}
          appearance="outline"
          status="danger"
          onPress={() => showReturnOrderModal()}
          accessoryLeft={() => (
            <Icon
              style={styles.buttonIcon}
              fill={theme["color-danger-500"]}
              name="close-circle-outline"
            />
          )}
        >
          {t("return_order")}
        </Button>

        <Button
          style={styles.actionButton as ViewStyle}
          status="primary"
          onPress={() => {
            navigation.reset({
              index: 1,
              routes: [
                { name: "TabNavigator" },
                { name: "CreateOrderScreen", params: { method: "create" } },
              ],
            });
          }}
          accessoryLeft={() => (
            <Icon style={styles.buttonIcon} fill="white" name="plus-outline" />
          )}
        >
          {t("create_new_order")}
        </Button>
      </Layout>

      {/* Return Modal */}
      <Modal
        visible={returnModalVisible}
        backdropStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        onBackdropPress={() => setReturnModalVisible(false)}
        style={{ width: "90%" }}
      >
        <Card style={styles.modalCard as ViewStyle} disabled>
          <Text category="h6" style={styles.modalTitle as TextStyle}>
            {t("return_order")}
          </Text>

          <Text category="s1" style={{ marginBottom: 12 }}>
            {t("select_return_items")}:
          </Text>

          <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
            {data?.order.map((item, index) => (
              <View key={index} style={styles.returnItemContainer as ViewStyle}>
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
                  style={styles.returnItemCheckbox as ViewStyle}
                />
                <Text>
                  {item.name} x{item.count} -{" "}
                  {Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(item.price * item.count)}
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
            style={styles.returnReasonInput as any}
          />

          <Text category="s1" style={styles.returnAmountText as TextStyle}>
            {t("total_return_amount")}:{" "}
            {data && (data.status === "cash" || data.status === "transfer")
              ? Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(currentReturnAmount)
              : t("unpaid_no_refund")}
          </Text>

          <View style={styles.modalButtonsContainer as ViewStyle}>
            <Button
              status="basic"
              onPress={() => setReturnModalVisible(false)}
              style={styles.modalButton as ViewStyle}
            >
              {t("cancel")}
            </Button>
            <Button
              status="danger"
              onPress={handleReturnOrder}
              style={styles.modalButton as ViewStyle}
              disabled={waiting}
              accessoryLeft={
                waiting
                  ? () => <Spinner size="small" status="basic" />
                  : undefined
              }
            >
              {waiting ? t("processing") : t("confirm_return")}
            </Button>
          </View>
        </Card>
      </Modal>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    paddingBottom: 100,
  },
  receiptContainer: {
    padding: 16,
    backgroundColor: "background-basic-color-1",
    borderRadius: 16,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  receiptHeader: {
    alignItems: "center",
    marginBottom: 12,
  },
  receiptTitle: {
    fontWeight: "bold",
    marginBottom: 4,
    color: "color-primary-600",
  },
  storeName: {
    marginBottom: 4,
  },
  receiptDateTime: {
    color: "text-hint-color",
    marginBottom: 4,
  },
  tableInfo: {
    color: "text-hint-color",
  },
  divider: {
    backgroundColor: "color-basic-400",
    height: 1,
  },
  dashedDivider: {
    height: 1,
    marginVertical: 12,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "color-basic-400",
    backgroundColor: "transparent",
  },
  columnHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    backgroundColor: "color-basic-200",
    borderRadius: 4,
  },
  columnHeaderText: {
    fontWeight: "bold",
    fontSize: 14,
    paddingHorizontal: 4,
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "color-basic-300",
  },
  itemName: {
    flex: 3,
    paddingRight: 4,
  },
  itemPrice: {
    flex: 2,
    textAlign: "center",
  },
  itemQuantity: {
    flex: 1,
    textAlign: "center",
  },
  itemTotal: {
    flex: 2,
    textAlign: "right",
  },
  summaryContainer: {
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  summaryLabel: {
    color: "text-hint-color",
  },
  summaryValue: {},
  finalPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "color-basic-300",
  },
  finalPriceLabel: {
    fontWeight: "bold",
  },
  finalPriceValue: {
    fontWeight: "bold",
    color: "color-primary-600",
  },
  paymentMethodContainer: {
    backgroundColor: "color-primary-100",
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
  },
  paymentMethodHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  paymentMethodIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  paymentMethodText: {
    fontWeight: "bold",
    color: "color-primary-600",
  },
  wifiContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "background-basic-color-1",
    borderRadius: 8,
    padding: 8,
  },
  wifiInfo: {
    color: "text-basic-color",
    fontSize: 14,
  },
  qrCodeContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  thankYouText: {
    marginTop: 16,
    color: "text-hint-color",
    textAlign: "center",
    fontStyle: "italic",
  },
  buttonsContainer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    justifyContent: "space-between",
    backgroundColor: "background-basic-color-1",
    borderTopWidth: 1,
    borderTopColor: "color-basic-300",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  buttonIcon: {
    width: 20,
    height: 20,
  },
  headerRight: {
    flexDirection: "row",
  },
  menuIcon: {
    backgroundColor: "transparent",
    borderWidth: 0,
    marginHorizontal: 4,
  },
  modalCard: {
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: 16,
  },
  returnItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  returnItemCheckbox: {
    marginRight: 12,
  },
  returnReasonInput: {
    marginBottom: 16,
  },
  returnAmountText: {
    marginBottom: 16,
    color: "color-primary-600",
    fontWeight: "bold",
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default ReceiptScreen;
