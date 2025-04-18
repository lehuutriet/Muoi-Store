import React, { useState, useEffect } from "react";
import { View, ViewStyle, TextStyle, Alert, ScrollView } from "react-native";
import {
  Layout,
  Input,
  Text,
  Button,
  StyleService,
  useStyleSheet,
  Card,
  Icon,
  Spinner,
  Divider,
  Select,
  SelectItem,
  IndexPath,
} from "@ui-kitten/components";
import { useDatabases, COLLECTION_IDS } from "../../hook/AppWrite";
import { useTranslation } from "react-i18next";
import { createNumberMask, useMaskedInputProps } from "react-native-mask-input";
import { LinearGradient } from "expo-linear-gradient";

const vndMask = createNumberMask({
  delimiter: ",",
  separator: ",",
  precision: 0,
});

interface Supplier {
  $id: string;
  name: string;
}

interface CreateWarehouseEntryScreenProps {
  navigation: any;
}

const CreateWarehouseEntryScreen: React.FC<CreateWarehouseEntryScreenProps> = ({
  navigation,
}) => {
  const { t } = useTranslation();
  const styles = useStyleSheet(styleSheet);
  const { createItem, getAllItem } = useDatabases();

  // State cho các trường dữ liệu
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [minStock, setMinStock] = useState("5");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  // State cho nhà cung cấp
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierIndex, setSelectedSupplierIndex] = useState<IndexPath>(
    new IndexPath(0)
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Lấy danh sách nhà cung cấp khi component mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const supplierData = await getAllItem(COLLECTION_IDS.suppliers);
        setSuppliers(supplierData);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách nhà cung cấp:", error);
      }
    };

    fetchSuppliers();
  }, []);

  // Component loading indicator
  const LoadingIndicator = (props: any) => (
    <View style={{ justifyContent: "center", alignItems: "center" }}>
      <Spinner size="small" status="basic" />
    </View>
  );

  const handleCreateEntry = async () => {
    if (loading) return;

    if (!productName.trim()) {
      Alert.alert("", t("product_name_required"));
      return;
    }

    const newQuantity = parseInt(quantity.replace(/\D/g, ""));
    const newMinStock = parseInt(minStock.replace(/\D/g, ""));

    if (isNaN(newQuantity) || newQuantity <= 0) {
      Alert.alert("", t("quantity_must_be_positive"));
      return;
    }

    setLoading(true);

    try {
      // Tạo bản ghi kho
      const warehouseEntry = await createItem(COLLECTION_IDS.warehouse, {
        productName: productName.trim(),
        quantity: newQuantity,
        minStock: newMinStock,
        price: price ? parseInt(price.replace(/\D/g, "")) : 0,
        transactionDate: new Date().toISOString(),
      });

      // Nếu có chọn nhà cung cấp, thêm giao dịch
      if (selectedSupplierIndex.row > 0 && suppliers.length > 0) {
        const supplier = suppliers[selectedSupplierIndex.row - 1];

        const transactionData = {
          supplierId: supplier.$id,
          supplierName: supplier.name,
          date: new Date().toISOString(),
          productName: productName.trim(),
          quantity: newQuantity,
          amount:
            newQuantity * (price ? parseInt(price.replace(/\D/g, "")) : 0),
          invoiceNumber: invoiceNumber || null,
          description: notes || t("stock_entry"),
        };

        await createItem(COLLECTION_IDS.supplierTransactions, transactionData);
      }

      Alert.alert("", t("add_inventory_success"), [
        { text: t("ok"), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Lỗi khi thêm hàng vào kho:", error);
      Alert.alert("", t("add_inventory_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={styles.container as ViewStyle}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#4169E1", "#3151B7"]}
          style={styles.headerGradient as ViewStyle}
        >
          <View style={styles.headerContent as ViewStyle}>
            <Icon
              name="plus-circle-outline"
              fill="white"
              style={styles.headerIcon}
            />
            <Text category="h5" style={styles.headerTitle as TextStyle}>
              {t("add_new_inventory")}
            </Text>
            <Text category="p2" style={styles.headerSubtitle as TextStyle}>
              {t("add_inventory_description")}
            </Text>
          </View>
        </LinearGradient>

        <Card style={styles.formCard as ViewStyle}>
          <Text category="s1" style={styles.sectionTitle as TextStyle}>
            {t("product_details")}
          </Text>
          <Divider style={styles.divider as ViewStyle} />

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

          <View style={styles.rowInput as ViewStyle}>
            <Input
              label={t("quantity")}
              {...useMaskedInputProps({
                value: quantity,
                onChangeText: (masked, unmasked) => setQuantity(unmasked),
                mask: vndMask,
              })}
              keyboardType="numeric"
              placeholder={t("enter_quantity")}
              style={styles.input as TextStyle}
              accessoryLeft={(props) => <Icon {...props} name="cube-outline" />}
            />
          </View>

          <Input
            label={t("min_stock")}
            {...useMaskedInputProps({
              value: minStock,
              onChangeText: (masked, unmasked) => setMinStock(unmasked),
              mask: vndMask,
            })}
            keyboardType="numeric"
            placeholder={t("enter_min_stock")}
            style={styles.input as TextStyle}
            accessoryLeft={(props) => (
              <Icon {...props} name="alert-triangle-outline" />
            )}
          />

          <Input
            label={t("import_price")}
            {...useMaskedInputProps({
              value: price,
              onChangeText: (masked, unmasked) => setPrice(unmasked),
              mask: vndMask,
            })}
            keyboardType="numeric"
            placeholder={t("enter_import_price")}
            style={styles.input as TextStyle}
            accessoryLeft={(props) => (
              <Icon {...props} name="pricetags-outline" />
            )}
            accessoryRight={(props) => <Text>VND</Text>}
          />

          {/* Phần thông tin nhà cung cấp */}
          <Text
            category="s1"
            style={{ ...(styles.sectionTitle as TextStyle), marginTop: 16 }}
          >
            {t("supplier_information")}
          </Text>
          <Divider style={styles.divider as ViewStyle} />

          <Select
            label={t("supplier")}
            placeholder={t("select_supplier")}
            value={
              selectedSupplierIndex.row > 0 && suppliers.length > 0
                ? suppliers[selectedSupplierIndex.row - 1].name
                : t("select_supplier")
            }
            selectedIndex={selectedSupplierIndex}
            onSelect={(index) => {
              if (!Array.isArray(index)) {
                setSelectedSupplierIndex(index);
              }
            }}
            style={styles.input as ViewStyle}
          >
            <>
              <SelectItem key="default" title={t("select_supplier")} />
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.$id} title={supplier.name} />
              ))}
            </>
          </Select>

          <Input
            label={t("invoice_number")}
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            placeholder={t("enter_invoice_number")}
            style={styles.input as TextStyle}
            accessoryLeft={(props) => (
              <Icon {...props} name="file-text-outline" />
            )}
          />

          <Input
            label={t("notes")}
            value={notes}
            onChangeText={setNotes}
            placeholder={t("enter_notes")}
            multiline={true}
            textStyle={{ minHeight: 60 }}
            style={styles.input as TextStyle}
            accessoryLeft={(props) => <Icon {...props} name="edit-2-outline" />}
          />

          <View style={styles.buttonContainer as ViewStyle}>
            <Button
              style={styles.cancelButton as ViewStyle}
              appearance="outline"
              status="basic"
              onPress={() => navigation.goBack()}
            >
              {t("cancel")}
            </Button>

            <Button
              style={styles.submitButton as ViewStyle}
              onPress={handleCreateEntry}
              status="primary"
              disabled={loading}
              accessoryLeft={loading ? LoadingIndicator : undefined}
            >
              {loading ? t("adding") : t("add_to_inventory")}
            </Button>
          </View>
        </Card>
      </ScrollView>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-1",
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
  formCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: "bold",
  },
  divider: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    borderRadius: 8,
  },
  rowInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 8,
  },
  submitButton: {
    flex: 2,
    marginLeft: 8,
    borderRadius: 8,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "color-basic-100",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "color-info-500",
  },
  tipIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
});

export default CreateWarehouseEntryScreen;
