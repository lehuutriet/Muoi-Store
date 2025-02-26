import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  View,
  Dimensions,
  ViewStyle,
  TextStyle,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Layout, Text, Card, Icon } from "@ui-kitten/components";
import { FloatingAction } from "react-native-floating-action";
import { StyleService, useStyleSheet } from "@ui-kitten/components";

// Định nghĩa kiểu cho navigation prop
type RootStackParamList = {
  CreateOrderScreen: {
    title: string;
    method: string;
  };
  CreateProductScreen: {
    title: string;
    method: string;
  };
  ManageOrderScreen: undefined;
  ManageProductScreen: undefined;
  ManageTableScreen: undefined;
};

// Định nghĩa kiểu cho navigation prop
type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

// Định nghĩa kiểu cho component props
type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
};

const HomeScreen = ({ navigation }: HomeScreenProps) => {
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

  const renderCategoryCard = (item: any) => (
    <Card
      style={styles.card as ViewStyle}
      onPress={() => navigation.navigate(item.screenName)}
    >
      <Icon
        style={styles.cardIcon}
        fill="#3366FF"
        name={item.icon}
        width={32}
        height={32}
      />
      <Text category="h6" style={styles.cardTitle as TextStyle}>
        {item.title}
      </Text>
    </Card>
  );

  return (
    <Layout style={styles.rootContainer as ViewStyle}>
      <View style={styles.container as ViewStyle}>
        {allCategoryAtom.map((item, index) => (
          <View key={item.id} style={styles.cardWrapper as ViewStyle}>
            {renderCategoryCard(item)}
          </View>
        ))}
      </View>

      <FloatingAction
        actions={actions}
        color="#3366FF"
        overlayColor="rgba(68, 68, 68, 0.6)"
        onPressItem={(screenName: string | undefined) => {
          if (
            screenName === "CreateOrderScreen" ||
            screenName === "CreateProductScreen"
          ) {
            navigation.navigate(screenName, {
              title:
                screenName === "CreateOrderScreen"
                  ? t("create_order")
                  : t("create_product"),
              method: "create",
            });
          }
        }}
      />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "background-basic-color-1",
  } as ViewStyle,
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "border-basic-color-3",
  } as ViewStyle,
  headerTitle: {
    marginBottom: 8,
    fontWeight: "bold",
  },
  container: {
    flex: 1,
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardWrapper: {
    width: "48%",
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: "center", // Thêm dòng này để căn giữa tất cả nội dung trong card
  },
  cardIcon: {
    marginBottom: 12,
    alignSelf: "center",
  },
  cardTitle: {
    textAlign: "center",
    fontWeight: "600",
  },
});

export default HomeScreen;
