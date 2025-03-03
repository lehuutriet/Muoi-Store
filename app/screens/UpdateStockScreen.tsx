import React, { useState, useEffect } from "react";
import { View, ViewStyle, TextStyle, Alert } from "react-native";
import {
  Layout,
  Input,
  Text,
  Button,
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { useTranslation } from "react-i18next";
import { createNumberMask, useMaskedInputProps } from "react-native-mask-input";

const vndMask = createNumberMask({
  delimiter: ",",
  separator: ",",
  precision: 3,
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
  const { updateItem } = useDatabases();
  const { item } = route.params;

  const [quantity, setQuantity] = useState(
    item.count ? item.count.toString() : "0"
  );
  const [cost, setCost] = useState(item.cost ? item.cost.toString() : "0");

  const handleUpdateStock = async () => {
    try {
      const updateData = {
        count: parseInt(quantity.replace(/\D/g, "")),
        cost: parseFloat(cost.replace(/\D/g, "")),
      };

      await updateItem(COLLECTION_IDS.products, item.$id, updateData);

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
      <View style={styles.formContainer as ViewStyle}>
        <Input
          label={t("current_quantity")}
          {...useMaskedInputProps({
            value: quantity,
            onChangeText: (masked, unmasked) => setQuantity(unmasked),
            mask: vndMask,
          })}
          keyboardType="numeric"
          placeholder={t("enter_quantity")}
        />

        <Input
          label={t("product_cost")}
          {...useMaskedInputProps({
            value: cost,
            onChangeText: (masked, unmasked) => setCost(unmasked),
            mask: vndMask,
          })}
          keyboardType="numeric"
          placeholder={t("enter_cost")}
        />

        <Button
          style={styles.updateButton as ViewStyle}
          onPress={handleUpdateStock}
        >
          {t("update_stock")}
        </Button>
      </View>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    padding: 16,
  },
  formContainer: {
    flex: 1,
    justifyContent: "center",
  },
  updateButton: {
    marginTop: 16,
  },
});

export default UpdateStockScreen;
