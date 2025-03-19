import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  RefreshControl,
  ViewStyle,
  TextStyle,
} from "react-native";
import {
  Layout,
  Text,
  Button,
  Card,
  Icon,
  List,
  Divider,
  Input,
  Modal,
  Toggle,
  Select,
  SelectItem,
  IndexPath,
  Datepicker,
  Spinner,
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { FloatingAction } from "react-native-floating-action";
import { useFocusEffect } from "@react-navigation/native";
import { createNumberMask, useMaskedInputProps } from "react-native-mask-input";
import { useRecoilValue } from "recoil";
import { allProductsAtom } from "../states";

const vndMask = createNumberMask({
  delimiter: ",",
  separator: ",",
  precision: 0,
});

interface Promotion {
  $id: string;
  name: string;
  type: "buy_x_get_y" | "discount_product" | "combo_deal";
  startDate: string;
  endDate: string;
  isActive: boolean;
  description?: string;
  details: {
    requiredProductId?: string;
    requiredQuantity?: number;
    freeProductId?: string;
    freeQuantity?: number;
    productId?: string;
    discountType?: "percentage" | "fixed";
    discountValue?: number;
    productIds?: string[];
    comboPrice?: number;
  };
}

interface Product {
  $id: string;
  name: string;
  price: number;
  photoUrl?: string;
}

const PromotionScreen = ({}) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const { getAllItem, createItem, updateItem, deleteItem } = useDatabases();
  const products = useRecoilValue<Product[]>(allProductsAtom);

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([]);
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(
    null
  );
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Form state
  const [promotionName, setPromotionName] = useState("");
  const [promotionType, setPromotionType] = useState<IndexPath>(
    new IndexPath(0)
  );
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(
    new Date(new Date().setMonth(new Date().getMonth() + 1))
  );
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");

  // Buy X Get Y state
  const [requiredProductIndex, setRequiredProductIndex] = useState<
    IndexPath | undefined
  >(undefined);
  const [requiredQuantity, setRequiredQuantity] = useState("1");
  const [freeProductIndex, setFreeProductIndex] = useState<
    IndexPath | undefined
  >(undefined);
  const [freeQuantity, setFreeQuantity] = useState("1");

  // Product Discount state
  const [discountProductIndex, setDiscountProductIndex] = useState<
    IndexPath | undefined
  >(undefined);
  const [discountType, setDiscountType] = useState<IndexPath>(new IndexPath(0));
  const [discountValue, setDiscountValue] = useState("");

  // Combo Deal state
  const [selectedComboProducts, setSelectedComboProducts] = useState<string[]>(
    []
  );
  const [comboPrice, setComboPrice] = useState("");

  // Hàm fetch dữ liệu promotion
  const fetchPromotions = useCallback(async () => {
    try {
      setRefreshing(true);
      const promotionsData = await getAllItem(COLLECTION_IDS.promotions);
      setPromotions(promotionsData);
      setFilteredPromotions(promotionsData);
    } catch (error) {
      console.error("Error fetching promotions:", error);
    } finally {
      setRefreshing(false);
    }
  }, [getAllItem]);

  // Lọc promotions theo từ khóa tìm kiếm
  useEffect(() => {
    if (searchText) {
      const filtered = promotions.filter(
        (promotion) =>
          promotion.name.toLowerCase().includes(searchText.toLowerCase()) ||
          (promotion.description &&
            promotion.description
              .toLowerCase()
              .includes(searchText.toLowerCase()))
      );
      setFilteredPromotions(filtered);
    } else {
      setFilteredPromotions(promotions);
    }
  }, [searchText, promotions]);

  useFocusEffect(
    React.useCallback(() => {
      fetchPromotions();
      return () => {};
    }, [])
  );

  const resetForm = () => {
    setPromotionName("");
    setPromotionType(new IndexPath(0));
    setStartDate(new Date());
    setEndDate(new Date(new Date().setMonth(new Date().getMonth() + 1)));
    setIsActive(true);
    setDescription("");
    setRequiredProductIndex(undefined);
    setRequiredQuantity("1");
    setFreeProductIndex(undefined);
    setFreeQuantity("1");
    setDiscountProductIndex(undefined);
    setDiscountType(new IndexPath(0));
    setDiscountValue("");
    setSelectedComboProducts([]);
    setComboPrice("");
    setSelectedPromotion(null);
  };

  const handleAddPromotion = () => {
    resetForm();
    setIsEditing(false);
    setModalVisible(true);
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setPromotionName(promotion.name);
    setPromotionType(
      new IndexPath(
        promotion.type === "buy_x_get_y"
          ? 0
          : promotion.type === "discount_product"
            ? 1
            : 2
      )
    );
    setStartDate(new Date(promotion.startDate));
    setEndDate(new Date(promotion.endDate));
    setIsActive(promotion.isActive);
    setDescription(promotion.description || "");

    // Phân tích details từ mảng chuỗi thành đối tượng
    const details: any = {};
    if (Array.isArray(promotion.details)) {
      promotion.details.forEach((item) => {
        const parts = item.split(":");
        if (parts.length >= 2) {
          const key = parts[0];
          const value = parts.slice(1).join(":"); // Đề phòng giá trị có chứa dấu ':'

          if (key === "productIds") {
            // Xử lý trường hợp đặc biệt cho productIds - chuyển thành mảng
            details[key] = value.split(",");
          } else if (!isNaN(Number(value))) {
            // Chuyển đổi giá trị số
            details[key] = Number(value);
          } else {
            // Giữ nguyên giá trị chuỗi
            details[key] = value;
          }
        }
      });
    }

    console.log("Parsed details:", details); // Log để debug

    // Set details dựa vào loại khuyến mãi
    if (promotion.type === "buy_x_get_y") {
      // Tìm index của sản phẩm cần mua trong danh sách sản phẩm
      const requiredIndex = products.findIndex(
        (p) => p.$id === details.requiredProductId
      );

      // Tìm index của sản phẩm được tặng trong danh sách sản phẩm
      const freeIndex = products.findIndex(
        (p) => p.$id === details.freeProductId
      );

      console.log(
        "Required product index:",
        requiredIndex,
        "Free product index:",
        freeIndex
      );

      // Đặt selected index cho sản phẩm cần mua nếu tìm thấy
      if (requiredIndex >= 0) {
        setRequiredProductIndex(new IndexPath(requiredIndex));
      } else {
        console.warn(
          "Required product not found in products list:",
          details.requiredProductId
        );
        setRequiredProductIndex(undefined);
      }

      // Đặt selected index cho sản phẩm được tặng nếu tìm thấy
      if (freeIndex >= 0) {
        setFreeProductIndex(new IndexPath(freeIndex));
      } else {
        console.warn(
          "Free product not found in products list:",
          details.freeProductId
        );
        setFreeProductIndex(undefined);
      }

      // Đặt số lượng
      setRequiredQuantity(details.requiredQuantity?.toString() || "1");
      setFreeQuantity(details.freeQuantity?.toString() || "1");
    } else if (promotion.type === "discount_product") {
      // Tìm index của sản phẩm được giảm giá trong danh sách sản phẩm
      const productIndex = products.findIndex(
        (p) => p.$id === details.productId
      );

      console.log("Discount product index:", productIndex);

      // Đặt selected index cho sản phẩm được giảm giá nếu tìm thấy
      if (productIndex >= 0) {
        setDiscountProductIndex(new IndexPath(productIndex));
      } else {
        console.warn(
          "Discount product not found in products list:",
          details.productId
        );
        setDiscountProductIndex(undefined);
      }

      // Đặt loại giảm giá (phần trăm hoặc cố định)
      setDiscountType(
        new IndexPath(details.discountType === "percentage" ? 0 : 1)
      );

      // Đặt giá trị giảm giá
      setDiscountValue(details.discountValue?.toString() || "");
    } else if (promotion.type === "combo_deal") {
      // Đặt danh sách ID sản phẩm trong combo
      if (Array.isArray(details.productIds)) {
        setSelectedComboProducts(details.productIds);
      } else if (typeof details.productIds === "string") {
        // Nếu productIds là chuỗi thì phân tách thành mảng
        setSelectedComboProducts(details.productIds.split(","));
      } else {
        setSelectedComboProducts([]);
      }

      // Đặt giá combo
      setComboPrice(details.comboPrice?.toString() || "");
    }

    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDeletePromotion = () => {
    if (!selectedPromotion) return;
    setDeleteModalVisible(true);
  };

  const confirmDeletePromotion = async () => {
    if (!selectedPromotion) return;

    try {
      setLoading(true);
      await deleteItem(COLLECTION_IDS.promotions, selectedPromotion.$id);
      setDeleteModalVisible(false);
      setModalVisible(false);
      Alert.alert("", t("promotion_deleted_successfully"));
      fetchPromotions();
    } catch (error) {
      console.error("Error deleting promotion:", error);
      Alert.alert("", t("error_deleting_promotion"));
    } finally {
      setLoading(false);
    }
  };

  const handleSavePromotion = async () => {
    // Validate basic fields
    if (!promotionName.trim()) {
      Alert.alert("", t("promotion_name_required"));
      return;
    }

    // Validate type-specific fields
    if (promotionType.row === 0) {
      // Buy X Get Y
      if (!requiredProductIndex) {
        Alert.alert("", t("required_product_needed"));
        return;
      }
      if (!freeProductIndex) {
        Alert.alert("", t("free_product_needed"));
        return;
      }
    } else if (promotionType.row === 1) {
      // Product Discount
      if (!discountProductIndex) {
        Alert.alert("", t("discount_product_needed"));
        return;
      }
      if (
        !discountValue ||
        isNaN(Number(discountValue)) ||
        Number(discountValue) <= 0
      ) {
        Alert.alert("", t("valid_discount_value_required"));
        return;
      }
      // For percentage, max value is 100
      if (discountType.row === 0 && Number(discountValue) > 100) {
        Alert.alert("", t("percentage_max_100"));
        return;
      }
    } else if (promotionType.row === 2) {
      // Combo Deal
      if (selectedComboProducts.length < 2) {
        Alert.alert("", t("select_at_least_two_products"));
        return;
      }
      if (!comboPrice || isNaN(Number(comboPrice)) || Number(comboPrice) <= 0) {
        Alert.alert("", t("valid_combo_price_required"));
        return;
      }
    }

    try {
      setLoading(true);

      // Prepare promotion data based on type
      let promotionData: any = {
        name: promotionName.trim(),
        type:
          promotionType.row === 0
            ? "buy_x_get_y"
            : promotionType.row === 1
              ? "discount_product"
              : "combo_deal",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isActive,
        description: description.trim() || undefined,
        details: [],
      };

      // Set type-specific details
      if (promotionType.row === 0) {
        // Buy X Get Y
        promotionData.details = [
          `requiredProductId:${products[requiredProductIndex!.row].$id}`,
          `requiredQuantity:${Number(requiredQuantity) || 1}`,
          `freeProductId:${products[freeProductIndex!.row].$id}`,
          `freeQuantity:${Number(freeQuantity) || 1}`,
        ];
      } else if (promotionType.row === 1) {
        // Product Discount
        promotionData.details = [
          `productId:${products[discountProductIndex!.row].$id}`,
          `discountType:${discountType.row === 0 ? "percentage" : "fixed"}`,
          `discountValue:${Number(discountValue)}`,
        ];
      } else if (promotionType.row === 2) {
        // Combo Deal
        const productIdsStr = `productIds:${selectedComboProducts.join(",")}`;
        const comboPriceStr = `comboPrice:${Number(comboPrice)}`;

        promotionData.details = [productIdsStr, comboPriceStr];
      }

      if (isEditing && selectedPromotion) {
        await updateItem(
          COLLECTION_IDS.promotions,
          selectedPromotion.$id,
          promotionData
        );
        Alert.alert("", t("promotion_updated_successfully"));
      } else {
        await createItem(COLLECTION_IDS.promotions, promotionData);
        Alert.alert("", t("promotion_created_successfully"));
      }

      setModalVisible(false);
      fetchPromotions();
    } catch (error) {
      console.error("Error saving promotion:", error);
      Alert.alert(
        "",
        isEditing
          ? t("error_updating_promotion")
          : t("error_creating_promotion")
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleComboProduct = (productId: string) => {
    if (selectedComboProducts.includes(productId)) {
      setSelectedComboProducts(
        selectedComboProducts.filter((id) => id !== productId)
      );
    } else {
      setSelectedComboProducts([...selectedComboProducts, productId]);
    }
  };

  const getProductById = (productId: string) => {
    return products.find((p) => p.$id === productId);
  };

  const getPromotionStatusBadge = (promotion: Promotion) => {
    const isExpired = new Date(promotion.endDate) < new Date();

    if (!promotion.isActive) {
      return (
        <View style={styles.statusBadge as ViewStyle}>
          <Text category="c2" style={styles.statusText as TextStyle}>
            {t("inactive")}
          </Text>
        </View>
      );
    }

    if (isExpired) {
      return (
        <View style={[styles.statusBadge, styles.expiredBadge] as ViewStyle[]}>
          <Text category="c2" style={styles.statusText as TextStyle}>
            {t("expired")}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.statusBadge, styles.activeBadge] as ViewStyle[]}>
        <Text category="c2" style={styles.activeText as TextStyle}>
          {t("active")}
        </Text>
      </View>
    );
  };

  const renderBuyXGetYDetails = (promotion: Promotion) => {
    // Phân tích details
    const details: any = {};
    if (Array.isArray(promotion.details)) {
      promotion.details.forEach((item) => {
        const [key, value] = item.split(":");
        if (!isNaN(Number(value))) {
          details[key] = Number(value);
        } else {
          details[key] = value;
        }
      });
    }

    const requiredProduct = getProductById(details.requiredProductId || "");
    const freeProduct = getProductById(details.freeProductId || "");

    if (!requiredProduct || !freeProduct) return null;

    return (
      <View style={styles.promotionDetails as ViewStyle}>
        <Text category="s2">
          {t("buy_x_get_y_description")
            .replace("{qty1}", details.requiredQuantity?.toString() || "1")
            .replace("{product1}", requiredProduct.name)
            .replace("{qty2}", details.freeQuantity?.toString() || "1")
            .replace("{product2}", freeProduct.name)}
        </Text>
      </View>
    );
  };

  const renderDiscountProductDetails = (promotion: Promotion) => {
    // Phân tích details từ mảng chuỗi
    const details: any = {};
    if (Array.isArray(promotion.details)) {
      promotion.details.forEach((item) => {
        const [key, value] = item.split(":");
        if (!isNaN(Number(value))) {
          details[key] = Number(value);
        } else {
          details[key] = value;
        }
      });
    }

    const product = getProductById(details.productId || "");

    if (!product) return null;

    const discountDisplay =
      details.discountType === "percentage"
        ? `${details.discountValue}%`
        : Intl.NumberFormat("vi-VN").format(details.discountValue || 0) + " đ";

    return (
      <View style={styles.promotionDetails as ViewStyle}>
        <Text category="s2">
          {t("discount_product_description")
            .replace("{discount}", discountDisplay)
            .replace("{product}", product.name)}
        </Text>
      </View>
    );
  };

  const renderComboDealDetails = (promotion: Promotion) => {
    if (
      !promotion.details.productIds ||
      promotion.details.productIds.length === 0
    )
      return null;

    const productNames = promotion.details.productIds.map((id) => {
      const product = getProductById(id);
      return product ? product.name : "Unknown Product";
    });

    // Calculate original total price
    let originalTotal = 0;
    promotion.details.productIds.forEach((id) => {
      const product = getProductById(id);
      if (product) {
        originalTotal += product.price;
      }
    });

    const savingsAmount = originalTotal - (promotion.details.comboPrice || 0);
    const savingsPercentage = Math.round((savingsAmount / originalTotal) * 100);

    return (
      <View style={styles.promotionDetails as ViewStyle}>
        <Text category="s2">
          {t("combo_includes")}: {productNames.join(", ")}
        </Text>
        <Text category="s2">
          {t("combo_price")}:{" "}
          {Intl.NumberFormat("vi-VN").format(promotion.details.comboPrice || 0)}{" "}
          đ
        </Text>
        <Text category="s2" status="success">
          {t("savings")}: {Intl.NumberFormat("vi-VN").format(savingsAmount)} đ (
          {savingsPercentage}%)
        </Text>
      </View>
    );
  };

  const renderPromotionItem = ({ item }: { item: Promotion }) => {
    const isExpired = new Date(item.endDate) < new Date();
    let statusColor = item.isActive
      ? isExpired
        ? "warning"
        : "success"
      : "danger";

    return (
      <Card
        status={statusColor}
        style={styles.promotionCard as ViewStyle}
        onPress={() => handleEditPromotion(item)}
      >
        <View style={styles.promotionHeader as ViewStyle}>
          <View>
            <Text category="h6">{item.name}</Text>
            <Text category="c1" appearance="hint">
              {t("valid_until")}: {new Date(item.endDate).toLocaleDateString()}
            </Text>
          </View>
          {getPromotionStatusBadge(item)}
        </View>

        <Divider style={styles.divider as ViewStyle} />

        <View style={styles.promotionTypeContainer as ViewStyle}>
          <View style={styles.promotionTypeTag as ViewStyle}>
            <Text category="c1" style={styles.promotionTypeText as TextStyle}>
              {item.type === "buy_x_get_y"
                ? t("buy_x_get_y")
                : item.type === "discount_product"
                  ? t("product_discount")
                  : t("combo_deal")}
            </Text>
          </View>
        </View>

        {item.type === "buy_x_get_y" && renderBuyXGetYDetails(item)}
        {item.type === "discount_product" && renderDiscountProductDetails(item)}
        {item.type === "combo_deal" && renderComboDealDetails(item)}

        {item.description && (
          <Text
            category="c1"
            appearance="hint"
            style={styles.promotionDescription as TextStyle}
          >
            {item.description}
          </Text>
        )}
      </Card>
    );
  };

  const renderPromotionForm = () => (
    <Modal
      visible={modalVisible}
      backdropStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onBackdropPress={() => setModalVisible(false)}
      style={{ width: "90%" }}
    >
      <Card disabled>
        <ScrollView style={{ maxHeight: 500 }}>
          <Text category="h5" style={styles.modalTitle as TextStyle}>
            {isEditing ? t("edit_promotion") : t("create_promotion")}
          </Text>

          <Input
            label={t("promotion_name")}
            placeholder={t("enter_promotion_name")}
            value={promotionName}
            onChangeText={setPromotionName}
            style={styles.input as TextStyle}
          />

          <Select
            label={t("promotion_type")}
            selectedIndex={promotionType}
            onSelect={(index) => {
              setPromotionType(index as IndexPath);
              // Reset type-specific fields
              setRequiredProductIndex(undefined);
              setRequiredQuantity("1");
              setFreeProductIndex(undefined);
              setFreeQuantity("1");
              setDiscountProductIndex(undefined);
              setDiscountValue("");
              setSelectedComboProducts([]);
              setComboPrice("");
            }}
            value={
              promotionType.row === 0
                ? t("buy_x_get_y")
                : promotionType.row === 1
                  ? t("product_discount")
                  : t("combo_deal")
            }
            style={styles.input as ViewStyle}
          >
            <SelectItem title={t("buy_x_get_y")} />
            <SelectItem title={t("product_discount")} />
            <SelectItem title={t("combo_deal")} />
          </Select>

          <Text category="label" style={styles.dateLabel as TextStyle}>
            {t("valid_period")}
          </Text>
          <View style={styles.dateContainer as ViewStyle}>
            <Datepicker
              label={t("start_date")}
              date={startDate}
              onSelect={(nextDate) => setStartDate(nextDate)}
              style={[styles.input, styles.dateInput] as ViewStyle[]}
              min={new Date()}
              max={endDate}
            />

            <Datepicker
              label={t("end_date")}
              date={endDate}
              onSelect={(nextDate) => setEndDate(nextDate)}
              style={[styles.input, styles.dateInput] as ViewStyle[]}
              min={startDate}
            />
          </View>

          <View style={styles.toggleContainer as ViewStyle}>
            <Text category="label">{t("active")}</Text>
            <Toggle
              checked={isActive}
              onChange={(checked) => setIsActive(checked)}
            />
          </View>

          {/* Render type-specific form fields */}
          {promotionType.row === 0 && (
            <View style={styles.typeSpecificForm as ViewStyle}>
              <Text category="h6" style={styles.sectionTitle as TextStyle}>
                {t("buy_x_get_y_settings")}
              </Text>

              <Select
                label={t("required_product")}
                selectedIndex={requiredProductIndex}
                onSelect={(index) =>
                  setRequiredProductIndex(index as IndexPath)
                }
                value={
                  requiredProductIndex !== undefined
                    ? products[requiredProductIndex.row].name
                    : ""
                }
                placeholder={t("select_product")}
                style={styles.input as ViewStyle}
              >
                {products.map((product) => (
                  <SelectItem title={product.name} key={product.$id} />
                ))}
              </Select>

              <Input
                label={t("required_quantity")}
                placeholder="1"
                value={requiredQuantity}
                onChangeText={setRequiredQuantity}
                keyboardType="numeric"
                style={styles.input as TextStyle}
              />

              <Select
                label={t("free_product")}
                selectedIndex={freeProductIndex}
                onSelect={(index) => setFreeProductIndex(index as IndexPath)}
                value={
                  freeProductIndex !== undefined
                    ? products[freeProductIndex.row].name
                    : ""
                }
                placeholder={t("select_product")}
                style={styles.input as ViewStyle}
              >
                {products.map((product) => (
                  <SelectItem title={product.name} key={product.$id} />
                ))}
              </Select>

              <Input
                label={t("free_quantity")}
                placeholder="1"
                value={freeQuantity}
                onChangeText={setFreeQuantity}
                keyboardType="numeric"
                style={styles.input as TextStyle}
              />
            </View>
          )}

          {promotionType.row === 1 && (
            <View style={styles.typeSpecificForm as ViewStyle}>
              <Text category="h6" style={styles.sectionTitle as TextStyle}>
                {t("product_discount_settings")}
              </Text>

              <Select
                label={t("product_to_discount")}
                selectedIndex={discountProductIndex}
                onSelect={(index) =>
                  setDiscountProductIndex(index as IndexPath)
                }
                value={
                  discountProductIndex !== undefined
                    ? products[discountProductIndex.row].name
                    : ""
                }
                placeholder={t("select_product")}
                style={styles.input as ViewStyle}
              >
                {products.map((product) => (
                  <SelectItem title={product.name} key={product.$id} />
                ))}
              </Select>

              <Select
                label={t("discount_type")}
                selectedIndex={discountType}
                onSelect={(index) => setDiscountType(index as IndexPath)}
                value={
                  discountType.row === 0 ? t("percentage") : t("fixed_amount")
                }
                style={styles.input as ViewStyle}
              >
                <SelectItem title={t("percentage")} />
                <SelectItem title={t("fixed_amount")} />
              </Select>

              <Input
                label={t("discount_value")}
                placeholder={discountType.row === 0 ? "10" : "10000"}
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="numeric"
                style={styles.input as TextStyle}
              />
            </View>
          )}

          {promotionType.row === 2 && (
            <View style={styles.typeSpecificForm as ViewStyle}>
              <Text category="h6" style={styles.sectionTitle as TextStyle}>
                {t("combo_deal_settings")}
              </Text>

              <Text
                category="label"
                style={styles.comboSelectLabel as TextStyle}
              >
                {t("select_combo_products")}
              </Text>

              <ScrollView style={styles.comboProductList as ViewStyle}>
                {products.map((product) => (
                  <Card
                    key={product.$id}
                    style={
                      [
                        styles.comboProductCard,
                        selectedComboProducts.includes(product.$id) &&
                          styles.selectedComboProduct,
                      ] as ViewStyle[]
                    }
                    onPress={() => toggleComboProduct(product.$id)}
                  >
                    <View style={styles.comboProductRow as ViewStyle}>
                      <View>
                        <Text>{product.name}</Text>
                        <Text category="c1">
                          {Intl.NumberFormat("vi-VN").format(product.price)} đ
                        </Text>
                      </View>
                      {selectedComboProducts.includes(product.$id) && (
                        <Icon
                          name="checkmark-circle-2"
                          fill="#4CAF50"
                          style={{ width: 24, height: 24 }}
                        />
                      )}
                    </View>
                  </Card>
                ))}
              </ScrollView>

              <Input
                label={t("combo_price")}
                {...useMaskedInputProps({
                  value: comboPrice,
                  onChangeText: (masked, unmasked) => setComboPrice(unmasked),
                  mask: vndMask,
                })}
                keyboardType="numeric"
                style={styles.input as TextStyle}
              />

              {selectedComboProducts.length > 0 && (
                <View style={styles.comboSummary as ViewStyle}>
                  <Text category="s2">
                    {t("selected_products")}: {selectedComboProducts.length}
                  </Text>
                  <Text category="s2">
                    {t("original_total")}:{" "}
                    {Intl.NumberFormat("vi-VN").format(
                      selectedComboProducts.reduce((total, id) => {
                        const product = getProductById(id);
                        return total + (product ? product.price : 0);
                      }, 0)
                    )}{" "}
                    đ
                  </Text>
                </View>
              )}
            </View>
          )}

          <Input
            label={t("description")}
            placeholder={t("optional")}
            value={description}
            onChangeText={setDescription}
            multiline
            textStyle={{ minHeight: 64 }}
            style={styles.input as TextStyle}
          />

          <View style={styles.buttonContainer as ViewStyle}>
            {isEditing && (
              <Button
                status="danger"
                appearance="outline"
                style={styles.deleteButton as ViewStyle}
                onPress={handleDeletePromotion}
              >
                {t("delete")}
              </Button>
            )}

            <Button
              appearance="outline"
              status="basic"
              onPress={() => setModalVisible(false)}
              style={styles.button as ViewStyle}
            >
              {t("cancel")}
            </Button>

            <Button
              status="primary"
              onPress={handleSavePromotion}
              disabled={loading}
              accessoryLeft={
                loading ? () => <Spinner size="small" /> : undefined
              }
              style={styles.button as ViewStyle}
            >
              {isEditing ? t("update") : t("create")}
            </Button>
          </View>
        </ScrollView>
      </Card>
    </Modal>
  );

  const renderDeleteConfirmation = () => (
    <Modal
      visible={deleteModalVisible}
      backdropStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onBackdropPress={() => setDeleteModalVisible(false)}
    >
      <Card>
        <Text category="h6" style={styles.deleteTitle as TextStyle}>
          {t("confirm_delete")}
        </Text>
        <Text style={styles.deleteMessage as TextStyle}>
          {t("delete_promotion_confirmation").replace(
            "{name}",
            selectedPromotion?.name || ""
          )}
        </Text>
        <View style={styles.deleteButtons as ViewStyle}>
          <Button
            appearance="outline"
            status="basic"
            onPress={() => setDeleteModalVisible(false)}
            style={styles.deleteButtonHalf as ViewStyle}
          >
            {t("cancel")}
          </Button>
          <Button
            status="danger"
            onPress={confirmDeletePromotion}
            disabled={loading}
            accessoryLeft={loading ? () => <Spinner size="small" /> : undefined}
            style={styles.deleteButtonHalf as ViewStyle}
          >
            {t("delete")}
          </Button>
        </View>
      </Card>
    </Modal>
  );

  const actions = [
    {
      text: t("add_promotion"),
      icon: require("../../assets/icons/plus-outline.png"),
      name: "AddPromotion",
      position: 1,
    },
  ];

  return (
    <Layout style={styles.container as ViewStyle}>
      <View style={styles.header as ViewStyle}>
        <Input
          placeholder={t("search_promotions")}
          value={searchText}
          onChangeText={setSearchText}
          accessoryLeft={(props) => <Icon {...props} name="search-outline" />}
          style={styles.searchInput as TextStyle}
        />
      </View>

      {filteredPromotions.length > 0 ? (
        <List
          data={filteredPromotions}
          renderItem={renderPromotionItem}
          style={styles.list as ViewStyle}
          contentContainerStyle={styles.listContent as ViewStyle}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchPromotions}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer as ViewStyle}>
          <Icon
            name="gift-outline"
            fill="#ddd"
            style={{ width: 64, height: 64, marginBottom: 16 }}
          />
          <Text appearance="hint">{t("no_promotions_found")}</Text>
          <Button
            style={{ marginTop: 16 }}
            appearance="outline"
            status="primary"
            onPress={handleAddPromotion}
          >
            {t("create_first_promotion")}
          </Button>
        </View>
      )}

      {renderPromotionForm()}
      {renderDeleteConfirmation()}

      <FloatingAction
        actions={actions}
        color="#4169E1"
        onPressItem={() => handleAddPromotion()}
      />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-2",
  },
  header: {
    padding: 16,
    backgroundColor: "background-basic-color-1",
  },
  headerTitle: {
    marginBottom: 16,
    textAlign: "center",
  },
  searchInput: {
    borderRadius: 24,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  promotionCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  promotionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    backgroundColor: "color-danger-100",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  expiredBadge: {
    backgroundColor: "color-warning-100",
  },
  activeBadge: {
    backgroundColor: "color-success-100",
  },
  statusText: {
    color: "color-danger-700",
  },
  activeText: {
    color: "color-success-700",
  },
  divider: {
    marginVertical: 8,
  },
  promotionTypeContainer: {
    marginBottom: 8,
  },
  promotionTypeTag: {
    backgroundColor: "color-primary-100",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  promotionTypeText: {
    color: "color-primary-700",
  },
  promotionDetails: {
    marginBottom: 8,
  },
  promotionDescription: {
    marginTop: 8,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  dateLabel: {
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dateInput: {
    width: "48%",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  typeSpecificForm: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  comboSelectLabel: {
    marginBottom: 8,
  },
  comboProductList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  comboProductCard: {
    marginBottom: 8,
    borderRadius: 8,
  },
  selectedComboProduct: {
    borderColor: "color-success-500",
    borderWidth: 1,
  },
  comboProductRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  comboSummary: {
    backgroundColor: "background-basic-color-2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  button: {
    marginLeft: 8,
  },
  deleteButton: {
    marginRight: "auto",
  },
  deleteTitle: {
    textAlign: "center",
    marginBottom: 16,
  },
  deleteMessage: {
    marginBottom: 16,
    textAlign: "center",
  },
  deleteButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  deleteButtonHalf: {
    flex: 1,
    margin: 4,
  },
});

export default PromotionScreen;
