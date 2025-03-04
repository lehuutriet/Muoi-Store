import React, { useState } from "react";
import { View, ViewStyle, TextStyle, Alert } from "react-native";
import {
  Layout,
  Input,
  Text,
  Button,
  StyleService,
  useStyleSheet,
  Card,
} from "@ui-kitten/components";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { useTranslation } from "react-i18next";
import { createNumberMask, useMaskedInputProps } from "react-native-mask-input";
import { useRecoilCallback } from "recoil";
import { allProductsAtom, productAtomFamily } from "../states";

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
  const { updateItem, getAllItem } = useDatabases();
  const { item } = route.params;

  const [quantity, setQuantity] = useState((item.stock ?? 0).toString());

  const [minStock, setMinStock] = useState((item.minStock ?? 0).toString());

  // Refresh Product List after update
  const refreshProductList = useRecoilCallback(
    ({ set }) =>
      async () => {
        try {
          const productData = await getAllItem(COLLECTION_IDS.products);

          // Cập nhật tất cả sản phẩm
          for (const product of productData) {
            set(productAtomFamily(product.$id), product);
          }

          // Cập nhật atom chứa tất cả sản phẩm
          set(allProductsAtom, productData);
        } catch (error) {
          console.error("Error refreshing product list:", error);
        }
      },
    []
  );

  const handleUpdateStock = async () => {
    try {
      const updateData = {
        stock: parseInt(quantity.replace(/\D/g, "")),
        minStock: parseInt(minStock.replace(/\D/g, "")),
      };

      await updateItem(COLLECTION_IDS.products, item.$id, updateData);

      // Cập nhật lại dữ liệu sản phẩm trong recoil store
      await refreshProductList();

      // Hiển thị thông báo thành công
      Alert.alert("", t("update_stock_success"), [
        { text: t("ok"), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Lỗi cập nhật kho hàng:", error);
      Alert.alert("", t("update_stock_error"));
    }
  };

  return (
    <Layout style={styles.container as ViewStyle}>
      <Card style={styles.card as ViewStyle}>
        <Text category="h6" style={styles.productName as TextStyle}>
          {item.name}
        </Text>

        <View style={styles.formContainer as ViewStyle}>
          <Input
            label={t("stock")}
            {...useMaskedInputProps({
              value: quantity,
              onChangeText: (masked, unmasked) => setQuantity(unmasked),
              mask: vndMask,
            })}
            keyboardType="numeric"
            placeholder={t("enter_quantity")}
            style={styles.input as TextStyle}
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
            style={styles.input as TextStyle}
          />

          <Button
            style={styles.updateButton as ViewStyle}
            onPress={handleUpdateStock}
          >
            {t("update_stock")}
          </Button>
        </View>
      </Card>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 8,
    marginBottom: 16,
  },
  productName: {
    marginBottom: 16,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  input: {
    marginBottom: 16,
  },
  updateButton: {
    marginTop: 8,
  },
});

export default UpdateStockScreen;
