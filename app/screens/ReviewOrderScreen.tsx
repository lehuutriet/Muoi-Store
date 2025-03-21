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
// Thêm interface Promotion
interface Promotion {
  $id: string;
  name: string;
  type: "buy_x_get_y" | "discount_product" | "combo_deal";
  startDate: string;
  endDate: string;
  isActive: boolean;
  description?: string;
  details: string[];
}

// Thêm interface Product nếu chưa có
interface Product {
  $id: string;
  name: string;
  price: number;
  photoUrl?: string;
  stock?: number;
  count?: number;
}
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
  // Thêm state để lưu trữ danh sách khuyến mãi và khuyến mãi đã áp dụng
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(
    null
  );
  const [promotionDiscount, setPromotionDiscount] = useState(0);
  const [promotionModalVisible, setPromotionModalVisible] = useState(false);

  const allProducts = useRecoilValue<Product[]>(allProductsAtom);
  // Tải danh sách khuyến mãi từ database
  useEffect(() => {
    const loadPromotions = async () => {
      try {
        const promotionsData = await getAllItem(COLLECTION_IDS.promotions, [
          Query.equal("isActive", true),
          Query.greaterThan("endDate", new Date().toISOString()),
        ]);
        setPromotions(promotionsData);
      } catch (error) {
        console.error("Lỗi khi tải khuyến mãi:", error);
      }
    };

    loadPromotions();
  }, []);

  // Kiểm tra xem khuyến mãi có thể áp dụng cho đơn hàng hiện tại không
  const checkPromotionApplicable = (promotion: Promotion) => {
    if (promotion.type === "buy_x_get_y") {
      // Trích xuất thông tin từ details
      const requiredProductId = promotion.details
        .find((detail) => detail.startsWith("requiredProductId:"))
        ?.split(":")[1];
      const requiredQuantity = parseInt(
        promotion.details
          .find((detail) => detail.startsWith("requiredQuantity:"))
          ?.split(":")[1] || "1"
      );

      // Kiểm tra đơn hàng có đủ sản phẩm yêu cầu không
      const productInOrder = order.order.find(
        (item) => item.$id === requiredProductId
      );
      return productInOrder && productInOrder.count >= requiredQuantity;
    } else if (promotion.type === "discount_product") {
      // Kiểm tra xem sản phẩm được giảm giá có trong đơn hàng không
      const productId = promotion.details
        .find((detail) => detail.startsWith("productId:"))
        ?.split(":")[1];

      // Đảm bảo sản phẩm có trong đơn hàng
      return order.order.some((item) => item.$id === productId);
    } else if (promotion.type === "combo_deal") {
      // Kiểm tra xem có đủ sản phẩm trong combo không
      const productIdsStr =
        promotion.details
          .find((detail) => detail.startsWith("productIds:"))
          ?.split(":")[1] || "";
      const productIds = productIdsStr.split(",");

      // Đảm bảo tất cả sản phẩm trong combo đều có trong đơn hàng
      return productIds.every((id) =>
        order.order.some((item) => item.$id === id)
      );
    }

    // Mặc định trả về false nếu không rơi vào các trường hợp trên
    return false;
  };
  // Thêm hàm getPromotionDescription
  const getPromotionDescription = (promotion: Promotion): string => {
    if (promotion.type === "buy_x_get_y") {
      // Trích xuất thông tin từ details
      const requiredProductId = promotion.details
        .find((detail) => detail.startsWith("requiredProductId:"))
        ?.split(":")[1];
      const requiredQuantity =
        promotion.details
          .find((detail) => detail.startsWith("requiredQuantity:"))
          ?.split(":")[1] || "1";
      const freeProductId = promotion.details
        .find((detail) => detail.startsWith("freeProductId:"))
        ?.split(":")[1];
      const freeQuantity =
        promotion.details
          .find((detail) => detail.startsWith("freeQuantity:"))
          ?.split(":")[1] || "1";

      // Lấy tên sản phẩm
      const requiredProduct =
        allProducts.find((p) => p.$id === requiredProductId)?.name ||
        "Sản phẩm";
      const freeProduct =
        allProducts.find((p) => p.$id === freeProductId)?.name || "Sản phẩm";

      return `Mua ${requiredQuantity} ${requiredProduct} tặng ${freeQuantity} ${freeProduct}`;
    } else if (promotion.type === "discount_product") {
      const productId = promotion.details
        .find((detail) => detail.startsWith("productId:"))
        ?.split(":")[1];
      const discountType = promotion.details
        .find((detail) => detail.startsWith("discountType:"))
        ?.split(":")[1];
      const discountValue =
        promotion.details
          .find((detail) => detail.startsWith("discountValue:"))
          ?.split(":")[1] || "0";

      const product =
        allProducts.find((p) => p.$id === productId)?.name || "Sản phẩm";

      if (discountType === "percentage") {
        return `Giảm ${discountValue}% cho ${product}`;
      } else {
        return `Giảm ${Intl.NumberFormat("vi-VN").format(Number(discountValue))}đ cho ${product}`;
      }
    } else if (promotion.type === "combo_deal") {
      const productIdsStr =
        promotion.details
          .find((detail) => detail.startsWith("productIds:"))
          ?.split(":")[1] || "";
      const comboPrice =
        promotion.details
          .find((detail) => detail.startsWith("comboPrice:"))
          ?.split(":")[1] || "0";

      const productIds = productIdsStr.split(",");
      const productCount = productIds.length;

      return `Combo ${productCount} sản phẩm với giá ${Intl.NumberFormat("vi-VN").format(Number(comboPrice))}đ`;
    }

    return promotion.description || "";
  };

  const applyBuyXGetYPromotion = (promotion: Promotion) => {
    // Trích xuất thông tin
    const requiredProductId = promotion.details
      .find((detail) => detail.startsWith("requiredProductId:"))
      ?.split(":")[1];
    const freeProductId = promotion.details
      .find((detail) => detail.startsWith("freeProductId:"))
      ?.split(":")[1];
    const freeQuantity = parseInt(
      promotion.details
        .find((detail) => detail.startsWith("freeQuantity:"))
        ?.split(":")[1] || "1"
    );

    // Tìm sản phẩm cần thêm vào đơn hàng
    const freeProduct = allProducts.find((p) => p.$id === freeProductId);
    if (freeProduct) {
      // Tạo một đối tượng mới thay vì sử dụng trực tiếp từ allProducts
      const orderItem: OrderItem = {
        $id: freeProduct.$id,
        name: freeProduct.name,
        price: 0, // Giá 0 vì miễn phí
        count: freeQuantity,
        photoUrl: freeProduct.photoUrl,
      };

      // Tạo một bản sao của danh sách đơn hàng
      const newOrder = [...order.order];

      // Kiểm tra xem sản phẩm đã có trong đơn hàng chưa
      const existingItemIndex = newOrder.findIndex(
        (item) => item.$id === freeProduct.$id
      );

      if (existingItemIndex >= 0) {
        // Nếu đã có, tạo một đối tượng mới với số lượng đã cập nhật
        newOrder[existingItemIndex] = {
          ...newOrder[existingItemIndex],
          count: newOrder[existingItemIndex].count + freeQuantity,
        };
      } else {
        // Nếu chưa có, thêm vào
        newOrder.push(orderItem);
      }

      setOrder({
        ...order,
        order: newOrder,
        promotionId: promotion.$id,
        // Không đặt promotionDiscount cho chương trình mua 1 tặng 1
      });

      setAppliedPromotion(promotion);
      setPromotionDiscount(0);

      Alert.alert("", t("promotion_applied_successfully"));
    }
  };

  // Thêm hàm áp dụng khuyến mãi giảm giá sản phẩm
  const applyDiscountProductPromotion = (promotion: Promotion) => {
    const productId = promotion.details
      .find((detail) => detail.startsWith("productId:"))
      ?.split(":")[1];
    const discountType = promotion.details
      .find((detail) => detail.startsWith("discountType:"))
      ?.split(":")[1];
    const discountValue = parseFloat(
      promotion.details
        .find((detail) => detail.startsWith("discountValue:"))
        ?.split(":")[1] || "0"
    );

    // Tìm sản phẩm trong đơn hàng
    const orderItem = order.order.find((item) => item.$id === productId);

    if (orderItem) {
      let discount = 0;

      if (discountType === "percentage") {
        discount = (orderItem.price * orderItem.count * discountValue) / 100;
        console.log(
          `Giảm ${discountValue}% cho ${orderItem.name}, số tiền: ${discount}`
        );
      } else {
        discount = Math.min(discountValue, orderItem.price * orderItem.count);
        console.log(`Giảm ${discount}đ cho ${orderItem.name}`);
      }

      // Cập nhật trạng thái
      setAppliedPromotion(promotion);
      setPromotionDiscount(discount);
      console.log("Đã cập nhật promotionDiscount:", discount);

      Alert.alert("", t("promotion_applied_successfully"));
    }
  };

  // Thêm hàm áp dụng combo deal
  const applyComboPromotion = (promotion: Promotion) => {
    const productIdsStr =
      promotion.details
        .find((detail) => detail.startsWith("productIds:"))
        ?.split(":")[1] || "";
    const comboPrice = parseFloat(
      promotion.details
        .find((detail) => detail.startsWith("comboPrice:"))
        ?.split(":")[1] || "0"
    );

    const productIds = productIdsStr.split(",");

    // Tính giá gốc của các sản phẩm trong combo
    let originalPrice = 0;
    for (const item of order.order) {
      if (productIds.includes(item.$id)) {
        originalPrice += item.price * item.count;
      }
    }

    // Tính tiền giảm giá
    const discount = originalPrice - comboPrice;

    if (discount > 0) {
      setAppliedPromotion(promotion);
      setPromotionDiscount(discount);

      // Cập nhật order
      setOrder({
        ...order,
        promotionId: promotion.$id,
        promotionDiscount: discount,
      });

      Alert.alert("", t("promotion_applied_successfully"));
    }
  };
  useEffect(() => {
    const loadCoupons = async () => {
      try {
        const currentDate = new Date().toISOString();
        const couponsData = await getAllItem(COLLECTION_IDS.coupons, [
          Query.equal("isActive", true),
          Query.greaterThan("endDate", currentDate),
          Query.lessThanEqual("startDate", currentDate),
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
  // Cập nhật useEffect tính toán giá đơn hàng
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

      // Trừ tiền giảm từ khuyến mãi
      if (appliedPromotion && promotionDiscount > 0) {
        finalSum = finalSum - promotionDiscount;
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
  }, [
    order,
    appliedCoupon,
    couponDiscount,
    appliedPromotion,
    promotionDiscount,
  ]);
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
      <Card style={styles.modalCard as ViewStyle} disabled={true}>
        <Text category="h6" style={styles.modalTitle as TextStyle}>
          {t("select_coupon")}
        </Text>

        <ScrollView
          style={styles.couponList as ViewStyle}
          showsVerticalScrollIndicator={true} // Hiển thị thanh cuộn
          indicatorStyle="black" // Tùy chỉnh màu (chỉ có tác dụng trên iOS)
          removeClippedSubviews={true} // Cải thiện hiệu suất
          scrollEventThrottle={16} // Tối ưu sự kiện cuộn
        >
          <View style={{ height: 8 }} />
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
                  activeOpacity={0.7}
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
          <View style={{ height: 8 }} />
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

      // Log ra để kiểm tra
      console.log("Tổng giá ban đầu:", sum);

      // Tính giá cuối cùng
      let finalSum = sum;

      // Trừ tiền giảm trực tiếp
      if (order.subtract > 0) {
        console.log("Trừ trực tiếp:", order.subtract);
        finalSum = finalSum - order.subtract;
      }

      // Trừ tiền giảm từ khuyến mãi
      if (promotionDiscount > 0) {
        console.log("Giảm giá khuyến mãi:", promotionDiscount);
        finalSum = finalSum - promotionDiscount;
      }

      // Trừ tiền giảm từ coupon
      if (couponDiscount > 0) {
        console.log("Giảm giá coupon:", couponDiscount);
        finalSum = finalSum - couponDiscount;
      }

      // Trừ phần trăm giảm giá
      if (order.discount > 0) {
        const discountAmount = Math.round((finalSum * order.discount) / 100);
        console.log("Giảm giá phần trăm:", discountAmount);
        finalSum = finalSum - discountAmount;
      }

      console.log("Giá cuối cùng:", finalSum);

      // Đảm bảo giá không âm
      setFinalPrice(Math.max(0, finalSum));
    }
  }, [
    order,
    appliedCoupon,
    couponDiscount,
    appliedPromotion,
    promotionDiscount,
  ]);

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
  // Khi xóa mã khuyến mãi
  const handleRemovePromotion = () => {
    // Nếu không có khuyến mãi đang áp dụng, return
    if (!appliedPromotion) return;

    // Xử lý đặc biệt cho loại "buy_x_get_y"
    if (appliedPromotion.type === "buy_x_get_y") {
      // Lấy ID sản phẩm miễn phí
      const freeProductId = appliedPromotion.details
        .find((detail) => detail.startsWith("freeProductId:"))
        ?.split(":")[1];

      if (freeProductId) {
        // Lọc ra các sản phẩm không phải là sản phẩm miễn phí
        const newOrder = order.order.filter((item) => {
          // Giữ lại tất cả sản phẩm không phải miễn phí
          return !(item.$id === freeProductId && item.price === 0);
        });

        // Cập nhật đơn hàng
        setOrder({
          ...order,
          order: newOrder,
          promotionId: undefined,
          promotionDiscount: 0,
        });
      }
    } else {
      // Các loại khuyến mãi khác chỉ cần cập nhật state
      setOrder({
        ...order,
        promotionId: undefined,
        promotionDiscount: 0,
      });
    }

    // Cập nhật các state khác
    setAppliedPromotion(null);
    setPromotionDiscount(0);
  };
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
          couponDiscount: Math.round(order.couponDiscount || 0),
          total: Math.round(finalPrice),
          customer: selectedCustomer ? selectedCustomer.$id : null,
          customerName: selectedCustomer ? selectedCustomer.name : null,
          customerPhone: selectedCustomer ? selectedCustomer.phone : null,
          promotionName: appliedPromotion ? appliedPromotion.name : undefined,
          promotionDiscount:
            promotionDiscount > 0 ? promotionDiscount : undefined,
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
  const renderPromotion = () => (
    <Modal
      visible={promotionModalVisible}
      backdropStyle={styles.backdrop as ViewStyle}
      onBackdropPress={() => setPromotionModalVisible(false)}
    >
      <Card style={styles.modalCard as ViewStyle} disabled={true}>
        <Text category="h6" style={styles.modalTitle as TextStyle}>
          {t("select_promotion")}
        </Text>

        <ScrollView
          style={styles.promotionList as ViewStyle}
          showsVerticalScrollIndicator={true}
          indicatorStyle="black"
          removeClippedSubviews={true}
          scrollEventThrottle={16}
        >
          <View style={{ height: 8 }} />
          {promotions.length > 0 ? (
            promotions.map((promotion) => {
              const isApplicable = checkPromotionApplicable(promotion);
              let reasonNotApplicable = "";
              if (!isApplicable) {
                if (promotion.type === "buy_x_get_y") {
                  reasonNotApplicable = t("need_more_required_products");
                } else if (promotion.type === "discount_product") {
                  reasonNotApplicable = t("product_not_in_order");
                } else if (promotion.type === "combo_deal") {
                  reasonNotApplicable = t("need_all_combo_products");
                } else {
                  reasonNotApplicable = t("conditions_not_met");
                }
              }
              return (
                <Card
                  key={promotion.$id}
                  style={[
                    styles.promotionItem as ViewStyle,
                    !isApplicable
                      ? (styles.disabledPromotion as ViewStyle)
                      : undefined,
                  ]}
                  onPress={() => {
                    if (isApplicable) {
                      if (promotion.type === "buy_x_get_y") {
                        applyBuyXGetYPromotion(promotion);
                      } else if (promotion.type === "discount_product") {
                        applyDiscountProductPromotion(promotion);
                      } else if (promotion.type === "combo_deal") {
                        applyComboPromotion(promotion);
                      }
                      setPromotionModalVisible(false);
                    } else {
                      Alert.alert("", t("promotion_not_applicable"));
                    }
                  }}
                  disabled={!isApplicable}
                >
                  <Text category="s1">{promotion.name}</Text>
                  <Text category="p2">
                    {getPromotionDescription(promotion)}
                  </Text>

                  {!isApplicable && (
                    <View style={styles.reasonContainer as ViewStyle}>
                      <Text category="c1" status="danger">
                        {reasonNotApplicable}
                      </Text>
                    </View>
                  )}
                </Card>
              );
            })
          ) : (
            <View style={styles.emptyPromotions as ViewStyle}>
              <Text appearance="hint">{t("no_promotions_available")}</Text>
            </View>
          )}
        </ScrollView>

        <Button status="basic" onPress={() => setPromotionModalVisible(false)}>
          {t("cancel")}
        </Button>
      </Card>
    </Modal>
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
        {/* Nút áp dụng khuyến mãi */}
        <Card style={styles.promotionCard as ViewStyle}>
          <View style={styles.sectionHeader as ViewStyle}>
            <Text category="h6">{t("promotions")}</Text>
          </View>

          {!appliedPromotion ? (
            <Button
              style={styles.selectPromotionButton as ViewStyle}
              status="basic"
              appearance="outline"
              accessoryLeft={(props) => <Icon {...props} name="gift-outline" />}
              onPress={() => setPromotionModalVisible(true)}
            >
              {t("select_promotion")}
            </Button>
          ) : (
            <View style={styles.appliedPromotion as ViewStyle}>
              <View style={styles.promotionInfo as ViewStyle}>
                <Text category="s1">{appliedPromotion.name}</Text>
                <Text category="p2" status="success">
                  {t("discount")}:{" "}
                  {Intl.NumberFormat("vi-VN").format(promotionDiscount)} đ
                </Text>
              </View>
              <Button
                size="tiny"
                status="basic"
                appearance="ghost"
                accessoryLeft={(props) => (
                  <Icon {...props} name="close-outline" />
                )}
                onPress={handleRemovePromotion} // Thay đổi ở đây
              />
            </View>
          )}
        </Card>

        {/* Modal chọn khuyến mãi */}

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
      {renderPromotion()}
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
    maxHeight: height * 0.5, // Tăng chiều cao
    marginBottom: 12,
    paddingHorizontal: 5, // Thêm padding
  },
  couponItem: {
    marginBottom: 12,
    borderRadius: 8,
    minHeight: 110, // Đặt chiều cao tối thiểu
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
  promotionCard: {
    margin: 16,
    borderRadius: 12,
  },
  selectPromotionButton: {
    marginTop: 8,
  },
  appliedPromotion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "color-success-100",
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 12,
  },
  promotionInfo: {
    flex: 1,
  },
  promotionList: {
    maxHeight: height * 0.5,
    marginBottom: 16,
  },
  promotionItem: {
    marginBottom: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  disabledPromotion: {
    opacity: 0.7,
    borderColor: "#F44336",
    borderWidth: 1,
  },
  emptyPromotions: {
    alignItems: "center",
    padding: 24,
  },
});

export default ReviewOrderScreen;
