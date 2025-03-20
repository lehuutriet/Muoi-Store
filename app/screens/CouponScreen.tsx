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
  ListItem,
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

const vndMask = createNumberMask({
  delimiter: ",",
  separator: ",",
  precision: 0,
});

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

const CouponScreen = ({}) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const { getAllItem, createItem, updateItem, deleteItem } = useDatabases();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  // Form state
  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState<IndexPath>(new IndexPath(0));
  const [couponValue, setCouponValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");

  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(
    new Date(new Date().setMonth(new Date().getMonth() + 1))
  );
  const [usageLimit, setUsageLimit] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Hàm fetch dữ liệu coupon
  const fetchCoupons = useCallback(async () => {
    try {
      setRefreshing(true);
      const couponsData = await getAllItem(COLLECTION_IDS.coupons);
      setCoupons(couponsData);
      setFilteredCoupons(couponsData);

      // Kiểm tra và vô hiệu hóa mã hết hạn
      const currentDate = new Date();
      const expiredCoupons = couponsData.filter(
        (coupon) => coupon.isActive && new Date(coupon.endDate) < currentDate
      );

      if (expiredCoupons.length > 0) {
        console.log(
          `Tìm thấy ${expiredCoupons.length} mã giảm giá đã hết hạn, đang vô hiệu hóa...`
        );

        // Cập nhật từng mã hết hạn trong database
        let updated = false;
        for (const coupon of expiredCoupons) {
          await updateItem(COLLECTION_IDS.coupons, coupon.$id, {
            isActive: false,
          });
          updated = true;
          console.log(`Đã vô hiệu hóa mã ${coupon.code}`);
        }

        // Nếu có cập nhật, fetch lại dữ liệu
        if (updated) {
          const updatedData = await getAllItem(COLLECTION_IDS.coupons);
          setCoupons(updatedData);
          setFilteredCoupons(updatedData);

          // Thông báo cho người dùng
          Alert.alert(
            t("expired_coupons_found"),
            t("expired_coupons_disabled").replace(
              "{count}",
              expiredCoupons.length.toString()
            )
          );
        }
      }
    } catch (error) {
      console.error("Error fetching coupons:", error);
    } finally {
      setRefreshing(false);
    }
  }, [getAllItem, updateItem]);
  // Thêm hàm này vào CouponScreen
  const checkAndDisableExpiredCoupons = async () => {
    try {
      const currentDate = new Date();
      const expiredCoupons = coupons.filter(
        (coupon) => coupon.isActive && new Date(coupon.endDate) < currentDate
      );

      if (expiredCoupons.length > 0) {
        await fetchCoupons();
        console.log(
          `Tìm thấy ${expiredCoupons.length} mã giảm giá đã hết hạn, đang vô hiệu hóa...`
        );

        // Cập nhật từng mã hết hạn trong database
        for (const coupon of expiredCoupons) {
          await updateItem(COLLECTION_IDS.coupons, coupon.$id, {
            isActive: false,
          });
          console.log(`Đã vô hiệu hóa mã ${coupon.code}`);
        }

        // Refresh lại danh sách coupon
        fetchCoupons();

        // Thông báo cho người dùng
        if (expiredCoupons.length > 0) {
          Alert.alert(
            t("expired_coupons_found"),
            t("expired_coupons_disabled").replace(
              "{count}",
              expiredCoupons.length.toString()
            )
          );
        }
      }
    } catch (error) {
      console.error("Lỗi khi vô hiệu hóa mã giảm giá hết hạn:", error);
    }
  };
  useEffect(() => {
    // Kiểm tra khi component mount
    checkAndDisableExpiredCoupons();

    // Thiết lập timer để kiểm tra mỗi giờ
    const timer = setInterval(() => {
      checkAndDisableExpiredCoupons();
    }, 3600000); // 1 giờ = 3600000 ms

    // Cleanup khi component unmount
    return () => clearInterval(timer);
  }, []);
  // Lọc coupons theo từ khóa tìm kiếm
  useEffect(() => {
    if (searchText) {
      const filtered = coupons.filter(
        (coupon) =>
          coupon.code.toLowerCase().includes(searchText.toLowerCase()) ||
          (coupon.description &&
            coupon.description.toLowerCase().includes(searchText.toLowerCase()))
      );
      setFilteredCoupons(filtered);
    } else {
      setFilteredCoupons(coupons);
    }
  }, [searchText, coupons]);
  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        await fetchCoupons();
        await checkAndDisableExpiredCoupons();
      };

      loadData();
      return () => {};
    }, [])
  );

  const resetForm = () => {
    setCouponCode("");
    setCouponType(new IndexPath(0));
    setCouponValue("");
    setMinOrderValue("");

    setStartDate(new Date());
    setEndDate(new Date(new Date().setMonth(new Date().getMonth() + 1)));
    setUsageLimit("1");
    setIsActive(true);
    setDescription("");
    setSelectedCoupon(null);
  };

  const handleAddCoupon = () => {
    resetForm();
    setIsEditing(false);
    setModalVisible(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setCouponCode(coupon.code);
    setCouponType(new IndexPath(coupon.type === "percentage" ? 0 : 1));
    setCouponValue(coupon.value.toString());
    setMinOrderValue(coupon.minOrderValue.toString());

    setStartDate(new Date(coupon.startDate));
    setEndDate(new Date(coupon.endDate));
    setUsageLimit(coupon.usageLimit.toString());
    setIsActive(coupon.isActive);
    setDescription(coupon.description || "");
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDeleteCoupon = () => {
    if (!selectedCoupon) return;
    setDeleteModalVisible(true);
  };

  const confirmDeleteCoupon = async () => {
    if (!selectedCoupon) return;

    try {
      setLoading(true);
      await deleteItem(COLLECTION_IDS.coupons, selectedCoupon.$id);
      setDeleteModalVisible(false);
      setModalVisible(false);
      Alert.alert("", t("coupon_deleted_successfully"));
      fetchCoupons();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      Alert.alert("", t("error_deleting_coupon"));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCoupon = async () => {
    // Validate
    if (!couponCode.trim()) {
      Alert.alert("", t("coupon_code_required"));
      return;
    }

    if (
      !couponValue ||
      isNaN(Number(couponValue)) ||
      Number(couponValue) <= 0
    ) {
      Alert.alert("", t("valid_coupon_value_required"));
      return;
    }

    try {
      setLoading(true);

      const couponData = {
        code: couponCode.trim().toUpperCase(),
        type: couponType.row === 0 ? "percentage" : "fixed",
        value: Number(couponValue),
        minOrderValue: Number(minOrderValue) || 0,

        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        usageLimit: Number(usageLimit) || 1,
        usageCount: isEditing ? selectedCoupon?.usageCount || 0 : 0,
        isActive,
        description: description.trim() || undefined,
      };

      if (isEditing && selectedCoupon) {
        await updateItem(
          COLLECTION_IDS.coupons,
          selectedCoupon.$id,
          couponData
        );
        Alert.alert("", t("coupon_updated_successfully"));
      } else {
        await createItem(COLLECTION_IDS.coupons, couponData);
        Alert.alert("", t("coupon_created_successfully"));
      }

      setModalVisible(false);
      fetchCoupons();
    } catch (error) {
      console.error("Error saving coupon:", error);
      Alert.alert(
        "",
        isEditing ? t("error_updating_coupon") : t("error_creating_coupon")
      );
    } finally {
      setLoading(false);
    }
  };

  const renderCouponItem = ({ item }: { item: Coupon }) => {
    const isExpired = new Date(item.endDate) < new Date();
    const discountDisplay =
      item.type === "percentage"
        ? `${item.value}%`
        : Intl.NumberFormat("vi-VN").format(item.value) + " đ";

    return (
      <Card
        status={!item.isActive || isExpired ? "danger" : "primary"}
        style={styles.couponCard as ViewStyle}
        onPress={() => handleEditCoupon(item)}
      >
        <View style={styles.couponHeader as ViewStyle}>
          <View style={styles.couponCodeContainer as ViewStyle}>
            <Text category="h6" style={styles.couponCode as TextStyle}>
              {item.code}
            </Text>
            {!item.isActive && (
              <View style={styles.statusBadge as ViewStyle}>
                <Text category="c2" style={styles.statusText as TextStyle}>
                  {t("inactive")}
                </Text>
              </View>
            )}
            {isExpired && (
              <View
                style={[styles.statusBadge, styles.expiredBadge] as ViewStyle[]}
              >
                <Text category="c2" style={styles.statusText as TextStyle}>
                  {t("expired")}
                </Text>
              </View>
            )}
          </View>
          <Text category="h5" style={styles.couponValue as TextStyle}>
            {discountDisplay}
          </Text>
        </View>

        <View style={styles.couponDetails as ViewStyle}>
          <Text category="s2">
            {t("min_order")}:{" "}
            {Intl.NumberFormat("vi-VN").format(item.minOrderValue)} đ
          </Text>

          <Text category="c1" appearance="hint">
            {t("valid_until")}: {new Date(item.endDate).toLocaleDateString()}
          </Text>
          <Text category="c1" appearance="hint">
            {t("usage")}: {item.usageCount}/{item.usageLimit}
          </Text>
        </View>

        {item.description && (
          <Text
            category="c1"
            appearance="hint"
            style={styles.couponDescription as TextStyle}
          >
            {item.description}
          </Text>
        )}
      </Card>
    );
  };

  const renderCouponForm = () => (
    <Modal
      visible={modalVisible}
      backdropStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onBackdropPress={() => setModalVisible(false)}
      style={{ width: "90%" }}
    >
      <Card disabled>
        <ScrollView style={{ maxHeight: 500 }}>
          <Text category="h5" style={styles.modalTitle as TextStyle}>
            {isEditing ? t("edit_coupon") : t("create_coupon")}
          </Text>

          <Input
            label={t("coupon_code")}
            placeholder={t("enter_coupon_code")}
            value={couponCode}
            onChangeText={setCouponCode}
            autoCapitalize="characters"
            style={styles.input as TextStyle}
          />

          <Select
            label={t("discount_type")}
            selectedIndex={couponType}
            onSelect={(index) => setCouponType(index as IndexPath)}
            value={couponType.row === 0 ? t("percentage") : t("fixed_amount")}
            style={styles.input as ViewStyle}
          >
            <SelectItem title={t("percentage")} />
            <SelectItem title={t("fixed_amount")} />
          </Select>

          <Input
            label={t("discount_value")}
            placeholder={couponType.row === 0 ? "10" : "10000"}
            value={couponValue}
            onChangeText={setCouponValue}
            keyboardType="numeric"
            style={styles.input as TextStyle}
          />

          <Input
            label={t("min_order_value")}
            {...useMaskedInputProps({
              value: minOrderValue,
              onChangeText: (masked, unmasked) => setMinOrderValue(unmasked),
              mask: vndMask,
            })}
            keyboardType="numeric"
            style={styles.input as TextStyle}
          />

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

          <Input
            label={t("usage_limit")}
            placeholder="1"
            value={usageLimit}
            onChangeText={setUsageLimit}
            keyboardType="numeric"
            style={styles.input as TextStyle}
          />

          <View style={styles.toggleContainer as ViewStyle}>
            <Text category="label">{t("active")}</Text>
            <Toggle
              checked={isActive}
              onChange={(checked) => setIsActive(checked)}
            />
          </View>

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
                onPress={handleDeleteCoupon}
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
              onPress={handleSaveCoupon}
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
          {t("delete_coupon_confirmation").replace(
            "{code}",
            selectedCoupon?.code || ""
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
            onPress={confirmDeleteCoupon}
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
      text: t("add_coupon"),
      icon: require("../../assets/icons/plus-outline.png"),
      name: "AddCoupon",
      position: 1,
    },
  ];

  return (
    <Layout style={styles.container as ViewStyle}>
      <View style={styles.header as ViewStyle}>
        <Input
          placeholder={t("search_coupons")}
          value={searchText}
          onChangeText={setSearchText}
          accessoryLeft={(props) => <Icon {...props} name="search-outline" />}
          style={styles.searchInput as TextStyle}
        />
      </View>

      {filteredCoupons.length > 0 ? (
        <List
          data={filteredCoupons}
          renderItem={renderCouponItem}
          style={styles.list as ViewStyle}
          contentContainerStyle={styles.listContent as ViewStyle}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchCoupons} />
          }
        />
      ) : (
        <View style={styles.emptyContainer as ViewStyle}>
          <Icon
            name="gift-outline"
            fill="#ddd"
            style={{ width: 64, height: 64, marginBottom: 16 }}
          />
          <Text appearance="hint">{t("no_coupons_found")}</Text>
          <Button
            style={{ marginTop: 16 }}
            appearance="outline"
            status="primary"
            onPress={handleAddCoupon}
          >
            {t("create_first_coupon")}
          </Button>
        </View>
      )}

      {renderCouponForm()}
      {renderDeleteConfirmation()}

      <FloatingAction
        actions={actions}
        color="#4169E1"
        onPressItem={() => handleAddCoupon()}
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
  couponCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  couponHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  couponCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  couponCode: {
    marginRight: 8,
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
  statusText: {
    color: "color-danger-700",
  },
  couponValue: {
    color: "color-primary-600",
  },
  couponDetails: {
    marginBottom: 8,
  },
  couponDescription: {
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

export default CouponScreen;
