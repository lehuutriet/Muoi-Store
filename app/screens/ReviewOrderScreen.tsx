import React, { useState, useEffect } from "react";

import {
  ScrollView,
  StyleSheet,
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
  ListItem,
  Avatar,
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
import { Query } from "appwrite";

const vndMask = createNumberMask({
  delimiter: ",",
  separator: ",",
  precision: 3,
});

const { width, height } = Dimensions.get("window");

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

interface Customer {
  $id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  totalSpent: number;

  lastVisit?: string;
  joinDate?: string;
  notes?: string;
}
interface Coupon {
  $id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderValue: number;
  maxDiscount?: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
  description?: string;
}
type RootStackParamList = {
  ReviewOrderScreen: { orderInfo?: any };
  ReceiptScreen: { receiptData: any };
  CreateOrderScreen: { method: string };
  AddCustomerScreen: { onCustomerCreated: (customer: any) => void };
};
type ReviewOrderScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ReviewOrderScreen"
>;

const ReviewOrderScreen: React.FC<ReviewOrderScreenProps> = ({
  route,
  navigation,
}) => {
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
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  // State cho khách hàng
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  // Thêm state quản lý coupon trong ReviewOrderScreen
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [loadingCoupon, setLoadingCoupon] = useState(false);

  // Thêm hàm kiểm tra và áp dụng mã giảm giá
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError(t("please_enter_coupon_code"));
      return;
    }

    setLoadingCoupon(true);
    setCouponError("");

    try {
      // Tìm kiếm mã giảm giá
      const coupons = await getAllItem(COLLECTION_IDS.coupons, [
        Query.equal("code", couponCode.trim().toUpperCase()),
      ]);

      if (coupons.length === 0) {
        setCouponError(t("coupon_not_found"));
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setLoadingCoupon(false);
        return;
      }

      const coupon = coupons[0];

      // Kiểm tra trạng thái hoạt động
      if (!coupon.isActive) {
        setCouponError(t("coupon_inactive"));
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setLoadingCoupon(false);
        return;
      }

      // Kiểm tra thời hạn
      const currentDate = new Date();
      const startDate = new Date(coupon.startDate);
      const endDate = new Date(coupon.endDate);

      if (currentDate < startDate || currentDate > endDate) {
        setCouponError(t("coupon_expired"));
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setLoadingCoupon(false);
        return;
      }

      // Kiểm tra số lần sử dụng
      if (coupon.usageCount >= coupon.usageLimit) {
        setCouponError(t("coupon_usage_limit_reached"));
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setLoadingCoupon(false);
        return;
      }

      // Kiểm tra giá trị đơn hàng tối thiểu
      if (totalPrice < coupon.minOrderValue) {
        setCouponError(
          t("minimum_order_value_not_met").replace(
            "{amount}",
            Intl.NumberFormat("vi-VN").format(coupon.minOrderValue)
          )
        );
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setLoadingCoupon(false);
        return;
      }

      // Tính chiết khấu
      let discount = 0;
      if (coupon.type === "percentage") {
        discount = (totalPrice * coupon.value) / 100;
        // Áp dụng giới hạn tối đa nếu có
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else {
        // Loại fixed
        discount = coupon.value;
      }

      // Cập nhật state
      setAppliedCoupon(coupon);
      setCouponDiscount(discount);

      // Cập nhật giá cuối cùng
      const newFinalPrice = totalPrice - discount - order.subtract;
      setFinalPrice(Math.max(0, newFinalPrice));

      // Cập nhật coupon vào order state
      setOrder({
        ...order,
        couponCode: coupon.code,
        couponDiscount: discount,
      });

      // Hiển thị thông báo thành công
      Alert.alert("", t("coupon_applied_successfully"));
    } catch (error) {
      console.error("Error applying coupon:", error);
      setCouponError(t("error_applying_coupon"));
    } finally {
      setLoadingCoupon(false);
    }
  };
  useEffect(() => {
    const loadCoupons = async () => {
      try {
        const couponsData = await getAllItem(COLLECTION_IDS.coupons, [
          Query.equal("isActive", true),
          Query.greaterThan("endDate", new Date().toISOString()),
        ]);
        setCoupons(couponsData);
      } catch (error) {
        console.error("Lỗi khi tải mã giảm giá:", error);
      }
    };

    loadCoupons();
  }, []);
  // Hàm xóa mã giảm giá đã áp dụng
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponDiscount(0);
    setCouponError("");

    // Cập nhật giá cuối cùng
    const newFinalPrice = totalPrice - order.subtract;
    setFinalPrice(Math.max(0, newFinalPrice));

    // Cập nhật order state
    setOrder({
      ...order,
      couponCode: undefined,
      couponDiscount: 0,
    });
  };

  // Cập nhật hàm tính giá cuối cùng trong useEffect để tính cả phần giảm giá từ coupon
  useEffect(() => {
    if (order && order.order && order.order.length > 0) {
      // Tính tổng giá tiền
      let sum = order.order.reduce((acc, item) => {
        if (item.price && item.count) {
          return acc + item.price * item.count;
        }
        return acc;
      }, 0);

      setTotalPrice(sum);

      // Trừ tiền giảm trực tiếp
      sum = order.subtract > 0 ? sum - order.subtract : sum;

      // Trừ tiền giảm từ coupon
      if (appliedCoupon && couponDiscount > 0) {
        sum = sum - couponDiscount;
      }

      // Trừ phần trăm giảm giá
      sum =
        order.discount > 0
          ? sum - Math.round((sum * order.discount) / 100)
          : sum;

      setFinalPrice(Math.max(0, sum));
    }
  }, [order, appliedCoupon, couponDiscount]);
  const [searchQuery, setSearchQuery] = useState("");
  // Trong ReviewOrderScreen, thêm vào hoặc sửa đoạn code hiện tại
  const [customerModalVisible, setCustomerModalVisible] = useState(false);

  // Thêm useEffect để tải lại danh sách khách hàng khi mở modal
  useEffect(() => {
    if (customerModalVisible) {
      // Tải lại danh sách khách hàng mỗi khi modal mở
      const loadCustomers = async () => {
        try {
          const customersData = await getAllItem(COLLECTION_IDS.customers);
          setCustomers(customersData || []);
          setFilteredCustomers(customersData || []);
        } catch (error) {
          console.error("Error loading customers:", error);
        }
      };

      loadCustomers();
    }
  }, [customerModalVisible]);
  // State cho vị trí đơn hàng
  const [selectedLocationIndex, setSelectedLocationIndex] =
    React.useState<IndexPath>(new IndexPath(0));

  // Khởi tạo từ order
  useEffect(() => {
    if (order && order.$id) {
      setOrder({ ...order, $id: order.$id });
      let tableIndex = tables.findIndex((table) => table.name === order.table);
      tableIndex = tableIndex >= 0 ? tableIndex + 1 : 0;
      setSelectedTableIndex(new IndexPath(tableIndex));

      // Khởi tạo vị trí
      const locationTypes = ["dine-in", "take-away", "delivery"];
      const locationIndex = locationTypes.indexOf(order.location || "dine-in");
      setSelectedLocationIndex(
        new IndexPath(locationIndex >= 0 ? locationIndex : 0)
      );
    }
  }, []);

  // Tải danh sách khách hàng
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const customersData = await getAllItem(COLLECTION_IDS.customers);
        setCustomers(customersData || []);
        setFilteredCustomers(customersData || []);
      } catch (error) {
        console.error("Error loading customers:", error);
      }
    };

    loadCustomers();
  }, []);

  // Kiểm tra nếu có customer ID từ order
  useEffect(() => {
    const checkCustomer = async () => {
      if (order && order.customer && !selectedCustomer) {
        try {
          const customerData = await getSingleItem(
            COLLECTION_IDS.customers,
            order.customer
          );
          if (customerData) {
            setSelectedCustomer(customerData);
          }
        } catch (error) {
          console.error("Lỗi khi tải thông tin khách hàng:", error);
        }
      }
    };

    checkCustomer();
  }, [order]);

  // Lọc khách hàng theo từ khóa tìm kiếm
  useEffect(() => {
    if (!searchQuery) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.phone.includes(searchQuery)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  // Thêm hàm xử lý khi chọn khách hàng
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerModalVisible(false);
    setSearchQuery("");

    // Cập nhật thông tin khách hàng vào đơn hàng
    setOrder({
      ...order,
      customer: customer.$id,
      customerName: customer.name,
      customerPhone: customer.phone,
    });
  };
  const handleSelectCoupon = (coupon: Coupon) => {
    let discount = 0;
    if (coupon.type === "percentage") {
      discount = (totalPrice * coupon.value) / 100;
      // Áp dụng giới hạn tối đa nếu có
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      // Loại fixed
      discount = coupon.value;
    }

    // Cập nhật state
    setAppliedCoupon(coupon);
    setCouponDiscount(discount);

    // Cập nhật coupon vào order state
    setOrder({
      ...order,
      couponCode: coupon.code,
      couponDiscount: discount,
    });

    // Đóng modal
    setCouponModalVisible(false);

    // Hiển thị thông báo thành công
    Alert.alert("", t("coupon_applied_successfully"));
  };
  const renderCouponModal = () => (
    <Modal
      visible={couponModalVisible}
      backdropStyle={styles.backdrop as ViewStyle}
      onBackdropPress={() => setCouponModalVisible(false)}
    >
      <Card style={styles.modalCard as ViewStyle}>
        <Text category="h6" style={styles.modalTitle as TextStyle}>
          {t("select_coupon")}
        </Text>

        <ScrollView style={styles.couponList as ViewStyle}>
          {coupons.length > 0 ? (
            coupons.map((coupon) => {
              // Chi tiết hơn về lý do không áp dụng được
              let isApplicable = true;
              let reasonNotApplicable = "";

              // Kiểm tra từng điều kiện
              if (totalPrice < coupon.minOrderValue) {
                isApplicable = false;
                reasonNotApplicable = t("min_order_not_met");
              } else if (coupon.usageCount >= coupon.usageLimit) {
                isApplicable = false;
                reasonNotApplicable = t("usage_limit_reached");
              }

              // Tính số tiền tiết kiệm
              let savingAmount = 0;
              if (coupon.type === "percentage") {
                savingAmount = (totalPrice * coupon.value) / 100;
                if (coupon.maxDiscount && savingAmount > coupon.maxDiscount) {
                  savingAmount = coupon.maxDiscount;
                }
              } else {
                savingAmount = coupon.value;
              }

              return (
                <Card
                  key={coupon.$id}
                  style={
                    [
                      styles.couponItem as ViewStyle,
                      !isApplicable
                        ? (styles.disabledCoupon as ViewStyle)
                        : undefined,
                    ] as ViewStyle[]
                  }
                  onPress={() => {
                    if (isApplicable) {
                      handleSelectCoupon(coupon);
                    } else {
                      // Thông báo lý do không thể áp dụng
                      Alert.alert("", reasonNotApplicable);
                    }
                  }}
                  disabled={!isApplicable}
                >
                  {/* Chỉ báo trạng thái - thanh màu trên cùng */}
                  <View
                    style={
                      {
                        height: 4,
                        backgroundColor: isApplicable
                          ? "#4CAF50" // xanh lá
                          : "#F44336", // đỏ
                        borderRadius: 2,
                        marginBottom: 8,
                      } as ViewStyle
                    }
                  />

                  <View style={styles.couponItemContent as ViewStyle}>
                    <View style={{ flex: 1 }}>
                      <Text
                        category="s1"
                        style={styles.couponCode as TextStyle}
                      >
                        {coupon.code}
                      </Text>
                      <Text category="c1" style={{ marginBottom: 4 }}>
                        {coupon.type === "percentage"
                          ? `${t("discount")}: ${coupon.value}%`
                          : `${t("discount")}: ${Intl.NumberFormat("vi-VN").format(coupon.value)} đ`}
                      </Text>
                      <Text category="c1" appearance="hint">
                        {t("min_order")}:{" "}
                        {Intl.NumberFormat("vi-VN").format(
                          coupon.minOrderValue
                        )}{" "}
                        đ
                      </Text>
                      <Text category="c1" appearance="hint">
                        {t("valid_until")}:{" "}
                        {new Date(coupon.endDate).toLocaleDateString()}
                      </Text>

                      {isApplicable && (
                        <Text
                          category="c1"
                          status="success"
                          style={{ marginTop: 4 }}
                        >
                          {t("saving")}:{" "}
                          {Intl.NumberFormat("vi-VN").format(savingAmount)} đ
                        </Text>
                      )}
                    </View>

                    {/* Hiển thị icon check hoặc alert */}
                    {isApplicable ? (
                      <Icon
                        name="checkmark-circle-2-outline"
                        fill="#4CAF50"
                        style={styles.statusIcon as ImageStyle}
                      />
                    ) : (
                      <Icon
                        name="alert-circle-outline"
                        fill="#F44336"
                        style={styles.statusIcon as ImageStyle}
                      />
                    )}
                  </View>

                  {/* Thêm thanh thông báo dưới nếu không áp dụng được */}
                  {!isApplicable && (
                    <View style={styles.reasonContainer as ViewStyle}>
                      <Text
                        category="c1"
                        status="danger"
                        style={{ textAlign: "center" }}
                      >
                        {reasonNotApplicable}
                      </Text>
                    </View>
                  )}
                </Card>
              );
            })
          ) : (
            <View style={styles.emptyCoupons as ViewStyle}>
              <Icon
                name="gift-outline"
                fill="#ddd"
                style={styles.emptyIcon as ImageStyle}
              />
              <Text appearance="hint">{t("no_coupons_available")}</Text>
            </View>
          )}
        </ScrollView>

        <Button
          style={styles.cancelButton as ViewStyle}
          status="basic"
          onPress={() => setCouponModalVisible(false)}
        >
          {t("cancel")}
        </Button>
      </Card>
    </Modal>
  );
  // Tính toán giá đơn hàng
  // Thay thế cả hai useEffect hiện tại bằng useEffect sau:
  useEffect(() => {
    if (order && order.order && order.order.length > 0) {
      // Tính tổng giá tiền gốc
      let sum = order.order.reduce((acc, item) => {
        if (item.price && item.count) {
          return acc + item.price * item.count;
        }
        return acc;
      }, 0);

      setTotalPrice(sum);

      // Tính giá cuối cùng sau khi trừ đi các khoản giảm giá
      let finalSum = sum;

      // Trừ tiền giảm trực tiếp
      if (order.subtract > 0) {
        finalSum = finalSum - order.subtract;
      }

      // Trừ tiền giảm từ coupon
      if (appliedCoupon && couponDiscount > 0) {
        finalSum = finalSum - couponDiscount;
      }

      // Trừ phần trăm giảm giá (áp dụng cuối cùng sau khi đã trừ các khoản khác)
      if (order.discount > 0) {
        finalSum = finalSum - Math.round((finalSum * order.discount) / 100);
      }

      // Đảm bảo giá cuối cùng không âm
      setFinalPrice(Math.max(0, finalSum));
    }
  }, [order, appliedCoupon, couponDiscount]);

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

  const extractIngredientsFromRecipe = (recipe: any) => {
    try {
      if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
        return [];
      }

      return recipe.ingredients
        .map((ingredientStr: any) => {
          const parts = ingredientStr.split(":");
          if (parts.length < 3) return null;

          const [productId, name, quantityStr] = parts;
          return {
            productId,
            name,
            quantity: parseInt(quantityStr) || 0,
          };
        })
        .filter((ingredient: any) => ingredient !== null);
    } catch (error) {
      console.error("Lỗi khi trích xuất nguyên liệu:", error);
      return [];
    }
  };

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
          couponCode: order.couponCode,
          couponDiscount: order.couponDiscount || 0,
          total: finalPrice,
          customer: selectedCustomer ? selectedCustomer.$id : null,
          customerName: selectedCustomer ? selectedCustomer.name : null,
          customerPhone: selectedCustomer ? selectedCustomer.phone : null,
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

        // Nếu đơn hàng là paid (đã thanh toán), cập nhật số lượng tồn kho và điểm khách hàng
        if (orderStatus === "cash" || orderStatus === "transfer") {
          // 1. Cập nhật điểm và chi tiêu cho khách hàng
          // Nếu có áp dụng coupon, cập nhật số lần sử dụng
          if (appliedCoupon) {
            try {
              await updateItem(COLLECTION_IDS.coupons, appliedCoupon.$id, {
                usageCount: appliedCoupon.usageCount + 1,
              });
              console.log("Đã cập nhật lượt sử dụng coupon");
            } catch (error) {
              console.error("Lỗi khi cập nhật số lần sử dụng coupon:", error);
            }
          }
          if (selectedCustomer) {
            try {
              // Tính điểm thưởng (ví dụ: cứ 10,000đ được 1 điểm)
              const pointsEarned = Math.floor(finalPrice / 10000);

              // Cập nhật thông tin khách hàng - thêm finalPrice vào totalSpent
              await updateItem(COLLECTION_IDS.customers, selectedCustomer.$id, {
                totalSpent: (selectedCustomer.totalSpent || 0) + finalPrice,
                points: (selectedCustomer.points || 0) + pointsEarned,
                lastVisit: new Date().toISOString(),
              });

              console.log(
                `Đã cập nhật điểm và tổng chi tiêu cho khách hàng: ${selectedCustomer.name}, thêm ${finalPrice} vào tổng chi tiêu`
              );

              // Hiển thị thông báo điểm cho người dùng sau khi hoàn thành
              if (pointsEarned > 0) {
                setTimeout(() => {
                  Alert.alert(
                    t("points_earned"),
                    t("points_earned_message")
                      .replace("{points}", pointsEarned.toString())
                      .replace("{customer}", selectedCustomer.name)
                  );
                }, 500);
              }
            } catch (error) {
              console.error("Lỗi khi cập nhật điểm khách hàng:", error);
            }
          }
          // 2. Duyệt qua từng sản phẩm trong đơn hàng để cập nhật tồn kho
          for (const item of order.order) {
            // Lấy thông tin sản phẩm
            const product = await getSingleItem(
              COLLECTION_IDS.products,
              item.$id
            );

            if (product) {
              // Cập nhật số lượng tồn kho của sản phẩm
              const currentStock = product.stock || 0;
              const newStock = Math.max(0, currentStock - item.count);
              await updateItem(COLLECTION_IDS.products, item.$id, {
                stock: newStock,
              });

              // Trừ nguyên liệu từ kho hàng dựa trên công thức
              const recipes = await getAllItem(COLLECTION_IDS.recipes);

              // Lọc các công thức phù hợp
              const matchingRecipes = recipes.filter((recipe) => {
                // Kiểm tra nếu output là mảng
                if (Array.isArray(recipe.output)) {
                  return recipe.output.some((outputStr: any) =>
                    outputStr.startsWith(`${item.$id}:`)
                  );
                }
                // Nếu output là chuỗi duy nhất
                else if (typeof recipe.output === "string") {
                  return recipe.output.startsWith(`${item.$id}:`);
                }
                return false;
              });

              if (matchingRecipes.length > 0) {
                const recipe = matchingRecipes[0];

                // Trích xuất thông tin nguyên liệu
                const ingredients = extractIngredientsFromRecipe(recipe);

                // Tạo bút toán xuất kho cho từng nguyên liệu
                for (const ingredient of ingredients) {
                  // Tính số lượng nguyên liệu cần trừ dựa trên số lượng sản phẩm bán
                  const ingredientQuantity = ingredient.quantity * item.count;

                  // Tạo bút toán xuất kho
                  await createItem(COLLECTION_IDS.warehouse, {
                    productName: ingredient.name,
                    quantity: -ingredientQuantity, // Số âm để thể hiện xuất kho
                    transactionDate: new Date().toISOString(),
                    note: `Sử dụng cho đơn hàng: ${result.$id}`,
                  });
                }
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

  // Thêm modal chọn khách hàng
  const renderCustomerModal = () => (
    <Modal
      visible={customerModalVisible}
      backdropStyle={styles.backdrop as ViewStyle}
      onBackdropPress={() => {
        setCustomerModalVisible(false);
        setSearchQuery("");
      }}
    >
      <Card style={styles.modalCard as ViewStyle}>
        <Text category="h6" style={styles.modalTitle as TextStyle}>
          {t("select_customer")}
        </Text>

        <Input
          placeholder={t("search_customers")}
          style={styles.modalInput as TextStyle}
          accessoryLeft={(props) => <Icon {...props} name="search-outline" />}
          onChangeText={setSearchQuery}
          value={searchQuery}
        />

        <ScrollView style={styles.customerList as ViewStyle}>
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <ListItem
                key={customer.$id}
                title={customer.name}
                description={`${customer.phone} • ${t("points")}: ${customer.points}`}
                onPress={() => handleSelectCustomer(customer)}
                accessoryLeft={(props) => (
                  <Avatar
                    {...props}
                    size="small"
                    source={require("../../assets/avatar-placeholder.png")}
                  />
                )}
              />
            ))
          ) : (
            <View style={styles.emptyCustomers as ViewStyle}>
              <Icon
                name="people-outline"
                fill="#ddd"
                style={styles.emptyIcon}
              />
              <Text appearance="hint">{t("no_customers_found")}</Text>
            </View>
          )}
        </ScrollView>

        <Divider style={styles.divider as ViewStyle} />

        <Button
          status="primary"
          appearance="outline"
          accessoryLeft={(props) => (
            <Icon {...props} name="person-add-outline" />
          )}
          onPress={() => {
            setCustomerModalVisible(false);
            setSearchQuery("");
            navigation.navigate("AddCustomerScreen", {
              onCustomerCreated: (newCustomer) => {
                setSelectedCustomer(newCustomer);
                setOrder({
                  ...order,
                  customer: newCustomer.$id,
                  customerName: newCustomer.name,
                  customerPhone: newCustomer.phone,
                });
              },
            });
          }}
        >
          {t("create_new_customer")}
        </Button>

        <Button
          style={styles.cancelButton as ViewStyle}
          status="basic"
          onPress={() => {
            setCustomerModalVisible(false);
            setSearchQuery("");
          }}
        >
          {t("cancel")}
        </Button>
      </Card>
    </Modal>
  );

  return (
    <Layout level="1" style={styles.container as ViewStyle}>
      <ScrollView>
        {/* Danh sách sản phẩm */}
        <View style={styles.productList as ViewStyle}>
          {order && order.order && order.order.length > 0 ? (
            order.order.map((item) => orderList(item))
          ) : (
            <View style={styles.emptyOrderView as ViewStyle}>
              <Icon
                name="shopping-cart-outline"
                fill="#ddd"
                style={styles.emptyIcon}
              />
              <Text appearance="hint">{t("no_products_in_order")}</Text>
            </View>
          )}
        </View>

        {/* Nút thêm sản phẩm */}
        <View style={styles.addProductButtonContainer as ViewStyle}>
          <Button
            style={styles.addProductButton as ViewStyle}
            size="small"
            appearance="outline"
            status="primary"
            accessoryLeft={(props) => <Icon {...props} name="plus-outline" />}
            onPress={() =>
              RootNavigation.navigate("CreateOrderScreen", { method: "update" })
            }
          >
            {t("add_product")}
          </Button>
        </View>

        <Divider />

        {/* Phần thông tin thanh toán */}
        <View style={styles.paymentInfo as ViewStyle}>
          {/* Tổng tiền */}
          <View style={styles.priceRow as ViewStyle}>
            <Text category="s1">{t("total_price")}</Text>
            <Text category="s1">
              {Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(totalPrice)}
            </Text>
          </View>
        </View>

        <Divider />

        {/* Phần mã giảm giá */}
        <Card style={styles.couponCard as ViewStyle}>
          <View style={styles.sectionHeader as ViewStyle}>
            <Text category="h6">{t("coupon_code")}</Text>
          </View>

          {!appliedCoupon ? (
            <Button
              style={styles.selectCouponButton as ViewStyle}
              status="basic"
              appearance="outline"
              accessoryLeft={(props) => <Icon {...props} name="gift-outline" />}
              onPress={() => setCouponModalVisible(true)}
            >
              {t("select_coupon")}
            </Button>
          ) : (
            <View style={styles.appliedCoupon as ViewStyle}>
              <View style={styles.couponInfo as ViewStyle}>
                <Text category="s1">{appliedCoupon.code}</Text>
                <Text category="p2" status="success">
                  {appliedCoupon.type === "percentage"
                    ? `- ${appliedCoupon.value}%`
                    : `- ${Intl.NumberFormat("vi-VN").format(appliedCoupon.value)} đ`}
                </Text>
              </View>
              <Button
                size="tiny"
                status="basic"
                appearance="ghost"
                accessoryLeft={(props) => (
                  <Icon {...props} name="close-outline" />
                )}
                onPress={handleRemoveCoupon}
              />
            </View>
          )}

          {couponError ? (
            <Text
              category="c1"
              status="danger"
              style={styles.couponError as TextStyle}
            >
              {couponError}
            </Text>
          ) : null}

          {appliedCoupon && (
            <Text
              category="p2"
              status="success"
              style={styles.couponDiscount as TextStyle}
            >
              {t("discount")}: -
              {Intl.NumberFormat("vi-VN").format(couponDiscount)} đ
            </Text>
          )}
        </Card>

        <Divider />

        {/* Giá cuối cùng */}
        <View style={styles.finalPriceContainer as ViewStyle}>
          <Text category="h6">{t("final_price")}</Text>
          <Text category="h6" status="primary">
            {Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(finalPrice)}
          </Text>
        </View>

        <Divider />

        {/* Thông tin đơn hàng */}
        <Card style={styles.orderInfoCard as ViewStyle}>
          {/* Chọn bàn */}
          <Select
            style={styles.formControl as ViewStyle}
            label={t("choose_table")}
            placeholder={t("choose_table")}
            value={
              tables.length > 0 && selectedTableIndex.row > 0
                ? tables[selectedTableIndex.row - 1].name
                : t("choose_table")
            }
            selectedIndex={selectedTableIndex}
            onSelect={(index) => {
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
              <SelectItem title={t("no_table_found")} />
            )}
          </Select>

          {/* Loại đơn hàng */}
          <Select
            style={styles.formControl as ViewStyle}
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
            onSelect={(index) => {
              if (index instanceof IndexPath) {
                setSelectedLocationIndex(index);
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

          {/* Thông tin khách hàng */}
          <View style={styles.cardSection as ViewStyle}>
            <View style={styles.sectionHeader as ViewStyle}>
              <Text category="h6">{t("customer_information")}</Text>
            </View>

            {selectedCustomer ? (
              <View style={styles.customerInfo as ViewStyle}>
                <View style={styles.customerDetails as ViewStyle}>
                  <Text category="s1">{selectedCustomer.name}</Text>
                  <Text appearance="hint">{selectedCustomer.phone}</Text>
                  {selectedCustomer.points > 0 && (
                    <View style={styles.pointsBadge as ViewStyle}>
                      <Icon
                        name="award-outline"
                        fill="#FFD700"
                        style={styles.badgeIcon}
                      />
                      <Text category="c1" status="warning">
                        {t("points")}: {selectedCustomer.points}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.customerActions as ViewStyle}>
                  <Button
                    size="small"
                    appearance="ghost"
                    onPress={() => setCustomerModalVisible(true)}
                  >
                    {t("change")}
                  </Button>
                  <Button
                    size="small"
                    appearance="ghost"
                    status="danger"
                    accessoryLeft={(props) => (
                      <Icon {...props} name="close-outline" />
                    )}
                    onPress={() => {
                      setSelectedCustomer(null);
                      setOrder({
                        ...order,
                        customer: "",
                        customerName: "",
                        customerPhone: "",
                      });
                    }}
                  >
                    {t("remove")}
                  </Button>
                </View>
              </View>
            ) : (
              <Button
                style={styles.selectCustomerButton as ViewStyle}
                appearance="outline"
                status="primary"
                onPress={() => setCustomerModalVisible(true)}
                accessoryLeft={(props) => (
                  <Icon {...props} name="person-add-outline" />
                )}
              >
                {t("select_customer")}
              </Button>
            )}
          </View>

          {/* Ghi chú */}
          <Input
            label={t("order_note")}
            style={styles.formControl as TextStyle}
            value={order.note}
            placeholder={t("enter_note_here")}
            multiline={true}
            textStyle={{ minHeight: 60 }}
            onChangeText={(nextValue) =>
              setOrder({ ...order, note: nextValue })
            }
          />

          {/* Ngày đặt hàng */}
          <Datepicker
            style={styles.formControl as ViewStyle}
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
        </Card>

        {/* Khoảng trống cho nút thanh toán */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Nút chức năng */}
      <Layout level="1" style={styles.buttonContainer as ViewStyle}>
        <Button
          style={styles.saveButton as ViewStyle}
          appearance="outline"
          status="primary"
          onPress={() => saveOrder()}
          accessoryLeft={(props) => <Icon {...props} name="save-outline" />}
        >
          {t("save_order")}
        </Button>
        <Button
          style={styles.paymentButton as ViewStyle}
          status="success"
          accessoryLeft={(props) => (
            <Icon {...props} name="credit-card-outline" />
          )}
          onPress={() => showAlertConfirm(t("payment"), t("payment_msg"))}
        >
          {t("payment")}
        </Button>
      </Layout>

      {/* Modals */}
      {renderCustomerModal()}
      {renderCouponModal()}
      <WaitingModal waiting={waiting} />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    paddingBottom: 100,
  },
  input: {
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "white",
    borderRadius: 0,
  },
  buttons: {
    display: "flex",
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    padding: 10,
    paddingBottom: 30,
  },
  // Các style cho phần khách hàng
  section: {
    margin: 10,
    borderRadius: 8,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  emptyCustomers: {
    alignItems: "center",
    padding: 24,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },

  // Thêm vào styleSheet
  couponSection: {
    padding: 10,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: "bold",
  },
  couponInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  couponInputField: {
    flex: 1,
    marginRight: 8,
  },
  applyButton: {
    minWidth: 80,
  },
  couponError: {
    marginTop: 4,
  },
  appliedCoupon: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "color-success-100",
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 12,
  },
  couponInfo: {
    flex: 1,
  },
  couponDiscount: {
    marginTop: 4,
    textAlign: "right",
  },
  selectCouponButton: {
    marginTop: 8,
  },

  notApplicableTag: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  emptyCoupons: {
    alignItems: "center",
    padding: 24,
  },

  productList: {
    padding: 8,
  },
  emptyOrderView: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },

  addProductButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addProductButton: {
    borderRadius: 16,
  },
  paymentInfo: {
    padding: 16,
    backgroundColor: "background-basic-color-1",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  priceInput: {
    width: 120,
    borderRadius: 4,
  },
  couponCard: {
    margin: 16,
    borderRadius: 12,
  },

  finalPriceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "background-basic-color-1",
  },
  orderInfoCard: {
    margin: 16,
    borderRadius: 12,
  },
  formControl: {
    marginBottom: 16,
  },
  cardSection: {
    marginBottom: 16,
  },
  customerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  customerDetails: {
    flex: 1,
  },
  customerActions: {
    flexDirection: "row",
  },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "color-warning-100",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  badgeIcon: {
    width: 14,
    height: 14,
    marginRight: 4,
  },
  selectCustomerButton: {
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "background-basic-color-1",
    borderTopWidth: 1,
    borderTopColor: "border-basic-color-3",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 8,
  },
  paymentButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 8,
  },
  cardItem: {
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardImg: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 8,
  },
  cardInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    padding: 0,
  },
  countIcon: {
    width: 16,
    height: 16,
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "border-basic-color-3",
    borderRadius: 4,
    height: 32,
    width: 96,
    justifyContent: "space-between",
  },
  // Style cho modals
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalCard: {
    width: width - 48,
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 12,
  },
  customerList: {
    maxHeight: height * 0.4,
    marginBottom: 16,
  },
  couponList: {
    maxHeight: height * 0.4,
    marginBottom: 16,
  },
  couponItem: {
    marginBottom: 8,
    borderRadius: 8,
  },
  couponItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  couponCode: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  statusIcon: {
    width: 24,
    height: 24,
  },
  reasonContainer: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    padding: 6,
    borderRadius: 4,
    marginTop: 8,
  },
  disabledCoupon: {
    opacity: 0.8,
    borderColor: "#F44336",
    borderWidth: 1,
  },
  cancelButton: {
    marginTop: 8,
  },
});

export default ReviewOrderScreen;
