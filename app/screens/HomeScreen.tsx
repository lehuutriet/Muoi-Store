import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View, Dimensions, ListRenderItemInfo } from "react-native";
// import { Button } from "react-native-elements";
import { Layout, Button, List, ListItem } from "@ui-kitten/components";
import { FloatingAction } from "react-native-floating-action";
import { StyleService, useStyleSheet } from "@ui-kitten/components";
import { CategoryList } from "../components/category";

const HomeScreen = ({ navigation }) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const allCategoryAtom = [
    {
      title: t("create_order"),
      id: "create_order",
      icon: "calendar-outline",
      screenName: "CreateOrderScreen",
      method: "create",
    },
    {
      title: t("manage_order"),
      id: "manage_order",
      icon: "checkmark-square-outline",
      screenName: "ManageOrderScreen",
      method: "manage",
    },
    {
      title: t("manage_product"),
      id: "manage_product",
      icon: "layout-outline",
      screenName: "ManageProductScreen",
      method: "manage",
    },
    {
      title: t("manage_table"),
      id: "manage_table",
      icon: "monitor-outline",
      screenName: "ManageTableScreen",
      method: "manage",
    },
  ];

  const actions = [
    {
      text: t("create_order"),
      icon: require("../../assets/icons/calendar-outline.png"),
      name: "CreateOrderScreen",
      position: 1,
    },
    {
      text: t("create_product"),
      icon: require("../../assets/icons/file-add-outline.png"),
      name: "CreateProductScreen",
      position: 2,
    },
  ];

  return (
    <Layout style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <View style={styles.container}>
        <CategoryList data={allCategoryAtom} />
        <FloatingAction
          actions={actions}
          onPressItem={(screenName) => {
            console.log(`selected button:: ${screenName}`);
            navigation.navigate(screenName, {
              title:
                screenName === "CreateOrderScreen"
                  ? t("create_order")
                  : screenName === "CreateProductScreen"
                  ? t("create_product")
                  : "",
              method: "create",
            });
          }}
        />
      </View>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    // paddingHorizontal: 20,
  },
  contentContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  buttonContainer: {
    width: "45%",
    margin: 10,
  },
});

export default HomeScreen;
