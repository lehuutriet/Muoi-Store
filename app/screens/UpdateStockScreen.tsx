import React, { useState, useEffect } from "react";
import { View, ViewStyle, TextStyle, Alert } from "react-native";
import {
  Layout,
  Input,
  Text,
  Button,
  StyleService,
  useStyleSheet,
  Card,
  Icon,
  Divider,
  TopNavigation,
  TopNavigationAction,
} from "@ui-kitten/components";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { createNumberMask, useMaskedInputProps } from "react-native-mask-input";
import { useDatabases, useAccounts, COLLECTION_IDS } from "../hook/AppWrite";
import { Query } from "appwrite";
import { Spinner } from "@ui-kitten/components";

const vndMask = createNumberMask({
  delimiter: ",",
  separator: ",",
  precision: 0,
});

interface UpdateStockProps {
  route: any;
  navigation: any;
}

const UpdateStockScreen: React.FC<UpdateStockProps> = ({
  route,
  navigation,
}) => {
  const { t } = useTranslation();
  const styles = useStyleSheet(styleSheet);

  // Chỉ gọi hooks một lần ở cấp cao nhất
  const { createItem, updateItem, getAllItem, deleteItem } = useDatabases();
  const { getUserPrefs } = useAccounts();

  const { item } = route.params;

  // State cho các trường dữ liệu
  const [productName, setProductName] = useState(item.name || "");
  const [quantity, setQuantity] = useState((item.currentStock || 0).toString());
  const [minStock, setMinStock] = useState((item.minStock ?? 0).toString());
  const [price, setPrice] = useState((item.price || 0).toString());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpdateStock = async () => {
    if (loading) return; // Tránh bấm nhiều lần

    setLoading(true); // Bắt đầu loading
    try {
      // Kiểm tra tên sản phẩm không được để trống
      if (!productName.trim()) {
        Alert.alert("", t("product_name_required"));
        setLoading(false);
        return;
      }

      const newQuantity = parseInt(quantity.replace(/\D/g, ""));
      const newMinStock = parseInt(minStock.replace(/\D/g, ""));
      const newPrice = parseInt(price.replace(/\D/g, ""));

      // Lấy thông tin user preferences
      const userPrefs = await getUserPrefs();

      // Sử dụng getAllItem đã khai báo ở cấp component
      const warehouseItems = await getAllItem(COLLECTION_IDS.warehouse, [
        Query.equal("productName", item.name),
        Query.orderDesc("transactionDate"),
        Query.limit(1),
      ]);

      if (warehouseItems.length > 0) {
        // Nếu tìm thấy, cập nhật bản ghi đó
        const latestItem = warehouseItems[0];
        await updateItem(COLLECTION_IDS.warehouse, latestItem.$id, {
          productName: productName.trim(),
          quantity: newQuantity,
          minStock: newMinStock,
          price: newPrice,
          transactionDate: new Date().toISOString(),
        });
      } else {
        // Nếu không tìm thấy, tạo mới
        await createItem(COLLECTION_IDS.warehouse, {
          productName: productName.trim(),
          quantity: newQuantity,
          minStock: newMinStock,
          price: newPrice,
          transactionDate: new Date().toISOString(),
        });
      }

      Alert.alert("", t("update_stock_success"), [
        { text: t("ok"), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Lỗi cập nhật kho hàng:", error);
      Alert.alert("", t("update_stock_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = () => {
    Alert.alert(
      t("confirm_deletion"),
      t("delete_item_confirmation").replace("{name}", productName || ""),
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: t("delete"),
          style: "destructive",
          onPress: deleteWarehouseItem,
        },
      ]
    );
  };

  const deleteWarehouseItem = async () => {
    setDeleting(true);
    try {
      const warehouseItems = await getAllItem(COLLECTION_IDS.warehouse, [
        Query.equal("productName", item.name),
      ]);

      if (warehouseItems.length > 0) {
        // Xóa tất cả mục liên quan đến sản phẩm này
        for (const warehouseItem of warehouseItems) {
          await deleteItem(COLLECTION_IDS.warehouse, warehouseItem.$id);
        }

        Alert.alert("", t("delete_success"), [
          { text: t("ok"), onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("", t("item_not_found"));
      }
    } catch (error) {
      console.error("Lỗi khi xóa sản phẩm:", error);
      Alert.alert("", t("delete_error"));
    } finally {
      setDeleting(false);
    }
  };

  const LoadingIndicator = () => (
    <View style={{ justifyContent: "center", alignItems: "center" }}>
      <Spinner size="small" status="basic" />
    </View>
  );

  return (
    <Layout style={styles.container as ViewStyle}>
      <LinearGradient
        colors={["#4169E1", "#3151B7"]}
        style={styles.headerGradient as ViewStyle}
      >
        <View style={styles.headerContent as ViewStyle}>
          <Icon
            name="refresh-outline"
            fill="white"
            style={styles.headerIcon as ViewStyle}
          />
          <Text category="h5" style={styles.headerTitle as TextStyle}>
            {t("update_inventory")}
          </Text>
          <Text category="p2" style={styles.headerSubtitle as TextStyle}>
            {t("update_inventory_description")}
          </Text>
        </View>
      </LinearGradient>
      <Card style={styles.card as ViewStyle}>
        <View style={styles.headerContainer as ViewStyle}>
          <Text category="h6" style={styles.productName as TextStyle}>
            {t("update_product_details")}
          </Text>
          <Icon
            name="info-outline"
            fill="#8F9BB3"
            style={styles.infoIcon as ViewStyle}
          />
        </View>

        <Divider style={styles.divider as ViewStyle} />

        <View style={styles.formContainer as ViewStyle}>
          <Input
            label={t("product_name")}
            value={productName}
            onChangeText={setProductName}
            placeholder={t("enter_product_name")}
            style={styles.input as TextStyle}
            size="large"
            status="primary"
            accessoryLeft={(props) => (
              <Icon {...props} name="shopping-bag-outline" />
            )}
          />

          <View style={styles.rowInputs as ViewStyle}>
            <Input
              label={t("quantity")}
              {...useMaskedInputProps({
                value: quantity,
                onChangeText: (masked, unmasked) => setQuantity(unmasked),
                mask: vndMask,
              })}
              keyboardType="numeric"
              placeholder={t("enter_quantity")}
              style={[styles.input as TextStyle, styles.halfInput as TextStyle]}
              accessoryLeft={(props) => <Icon {...props} name="cube-outline" />}
            />

            <Input
              label={t("min_stock")}
              {...useMaskedInputProps({
                value: minStock,
                onChangeText: (masked, unmasked) => setMinStock(unmasked),
                mask: vndMask,
              })}
              keyboardType="numeric"
              placeholder={t("enter_min_stock")}
              style={[styles.input as TextStyle, styles.halfInput as TextStyle]}
              accessoryLeft={(props) => (
                <Icon {...props} name="alert-triangle-outline" />
              )}
            />
          </View>

          <Input
            label={t("price")}
            {...useMaskedInputProps({
              value: price,
              onChangeText: (masked, unmasked) => setPrice(unmasked),
              mask: vndMask,
            })}
            keyboardType="numeric"
            placeholder={t("enter_price")}
            style={styles.input as TextStyle}
            accessoryLeft={(props) => (
              <Icon {...props} name="pricetags-outline" />
            )}
            accessoryRight={(props) => <Text style={{}}>{t("currency")}</Text>}
          />

          <View style={styles.buttonContainer as ViewStyle}>
            <Button
              style={styles.deleteButton as ViewStyle}
              onPress={handleDeleteItem}
              status="danger"
              appearance="outline"
              disabled={deleting}
              accessoryLeft={(props) => (
                <Icon {...props} name="trash-2-outline" />
              )}
            >
              {t("delete")}
            </Button>

            <Button
              style={styles.updateButton as ViewStyle}
              onPress={handleUpdateStock}
              status="success"
              disabled={loading}
              accessoryLeft={
                loading
                  ? LoadingIndicator
                  : (props) => <Icon {...props} name="save-outline" />
              }
            >
              {loading ? t("updating") : t("update")}
            </Button>
          </View>
        </View>
      </Card>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "background-basic-color-2",
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  productName: {
    textAlign: "left",
    fontWeight: "bold",
    color: "text-primary-color",
  },
  infoIcon: {
    width: 24,
    height: 24,
  },
  divider: {
    marginBottom: 20,
  },
  formContainer: {
    width: "100%",
  },
  input: {
    marginBottom: 16,
    borderRadius: 8,
  },
  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  deleteButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 8,
  },
  updateButton: {
    flex: 2,
    marginLeft: 8,
    borderRadius: 8,
  },
  currentStockLabel: {
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "bold",
  },
  headerGradient: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
  },
  headerContent: {
    alignItems: "center",
  },
  headerIcon: {
    width: 48,
    height: 48,
    marginBottom: 16,
  },
  headerTitle: {
    color: "white",
    fontWeight: "bold",
    marginBottom: 8,
  },
  headerSubtitle: {
    color: "white",
    opacity: 0.8,
    textAlign: "center",
  },
});

export default UpdateStockScreen;
