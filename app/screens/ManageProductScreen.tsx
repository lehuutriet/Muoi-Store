import React, { useEffect, useState, useCallback, memo } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Dimensions,
  ScrollView,
  ViewStyle,
  StyleProp,
  TextStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  Text,
  Button,
  StyleService,
  useStyleSheet,
  TabBar,
  Tab,
  Layout,
  List,
  ListItem,
  Icon,
  Modal,
  useTheme,
  Card,
  Divider,
  Input,
} from "@ui-kitten/components";
import { FloatingAction } from "react-native-floating-action";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import ProductList from "../components/product/ProductList";
import { CategoryScrollbar } from "../components/category";
import { CreatePropsCard } from "../components/common";
import * as RootNavigation from "../navigator/RootNavigation";
import { useRecoilState, useRecoilValue, useRecoilCallback } from "recoil";
import {
  allCategoryAtom,
  categoryAtomFamily,
  categoryIdsAtom,
} from "../states";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { MaterialTopTabNavigationProp } from "@react-navigation/material-top-tabs";
import { ParamListBase } from "@react-navigation/native";
import {
  MaterialTopTabBarProps,
  MaterialTopTabNavigationOptions,
} from "@react-navigation/material-top-tabs";

const { Navigator, Screen } = createMaterialTopTabNavigator();
interface FunctionCardProps {
  cardProps: {
    visible: boolean;
    method: "create" | "update" | "delete" | "cancel";
    itemInfo: {
      $id: string;
      name: string;
    };
  };
  setCardPropsCallback: (props: {
    method: string;
    visible: boolean;
    itemInfo: {
      $id: string;
      name: string;
    };
  }) => void;
}

// Định nghĩa interface cho props của CategoryCard
interface CategoryCardProps {
  categoryId: string;
  setCardPropsCallback: (props: {
    method: string;
    visible: boolean;
    itemInfo: {
      $id: string;
      name: string;
    };
  }) => void;
}

const DEFAULT_CARD_PROPS: {
  visible: boolean;
  method: "create" | "update" | "delete" | "cancel";
  itemInfo: {
    $id: string;
    name: string;
  };
} = {
  visible: false,
  method: "create",
  itemInfo: {
    $id: "",
    name: "",
  },
};

const ProductScreen = () => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const categories = useRecoilValue(allCategoryAtom);

  const [selectedCategory, setSelectedCategory] = useState("all");

  const productScreenActions = [
    {
      text: t("create_product"),
      icon: require("../../assets/icons/plus-outline.png"),
      name: "CreateProductScreen",
      position: 1,
    },
  ];

  return (
    <Layout style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {categories && categories.length > 0 ? (
        <CategoryScrollbar
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
      ) : (
        <></>
      )}
      <ProductList
        screen="manage"
        editable={true}
        category={selectedCategory}
      />
      <FloatingAction
        actions={productScreenActions}
        overrideWithAction={true}
        showBackground={false}
        onPressItem={(screenName) => {
          console.log(`selected button:: ${screenName}`);
          RootNavigation.navigate(screenName, {
            title: t("create_product"),
            method: "create",
          });
        }}
      />
    </Layout>
  );
};

const FunctionCard: React.FC<FunctionCardProps> = ({
  cardProps,
  setCardPropsCallback,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { getAllItem } = useDatabases();

  const categoryScreenActions = [
    {
      text: t("create_category"),
      icon: require("../../assets/icons/plus-outline.png"),
      name: "CreateCategoryScreen",
      position: 1,
    },
  ];

  const refreshCategory = useRecoilCallback(
    ({ set }) =>
      async (refresh) => {
        setCardPropsCallback(DEFAULT_CARD_PROPS);
        if (refresh) {
          const categoryData = await getAllItem(COLLECTION_IDS.categories);
          set(allCategoryAtom, categoryData);
          const ids = [];
          for (const category of categoryData) {
            ids.push(category.$id);
            set(categoryAtomFamily(category.$id), category);
          }
          set(categoryIdsAtom, ids);
        }
      },
    []
  );

  return cardProps.visible ? (
    <CreatePropsCard
      collection={COLLECTION_IDS.categories}
      method={cardProps.method}
      onFinished={(refresh) => refreshCategory(refresh)}
      itemInfo={cardProps.itemInfo}
    />
  ) : (
    <FloatingAction
      actions={categoryScreenActions}
      onPressMain={() => console.log("floating button pressed::")}
      overrideWithAction={true}
      showBackground={false}
      onPressItem={(screenName) => {
        console.log(`selected button:: ${screenName}`);
        setCardPropsCallback({
          method: DEFAULT_CARD_PROPS.method,
          visible: true,
          itemInfo: DEFAULT_CARD_PROPS.itemInfo,
        });
        // RootNavigation.navigate(screenName);
      }}
    />
  );
};

const CategoryCard = ({
  categoryId,
  setCardPropsCallback,
}: CategoryCardProps): React.ReactElement => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const [category, setCategory] = useRecoilState(
    categoryAtomFamily(categoryId)
  );
  console.log("category::", categoryId);

  const theme = useTheme();
  return (
    <Card
      onPress={() =>
        setCardPropsCallback({
          method: "edit",
          visible: true,
          itemInfo: category,
        })
      }
      style={styles.categoryCard as ViewStyle}
      // title={category.name}
      // description="A set of React Native components"
      // accessoryLeft={(props) => (
      //   <Icon {...props} fill="blue" name="shopping-bag-outline"></Icon>
      // )}
    >
      <View
        style={{
          display: "flex",
          flexDirection: "row",
        }}
      >
        <Icon
          style={styles.icon}
          name="clipboard-outline"
          fill={theme["color-info-800"]}
        ></Icon>
        <Text style={{ paddingLeft: 10 }}> {category.name}</Text>
      </View>
    </Card>
  );
};

const MemoizedCategoryCard = memo(
  CategoryCard,
  (prev, next) => prev.categoryId === next.categoryId
);

const CategoryScreen = () => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  // const { getAllItem } = useDatabases();
  const [cardProps, setCardProps] = useState(DEFAULT_CARD_PROPS);
  const categoryIds = useRecoilValue(categoryIdsAtom);

  const setCardPropsCallback = useCallback((props: any) => {
    setCardProps((prev) => ({
      method: props.method,
      visible: props.visible,
      itemInfo: props.itemInfo,
    }));
  }, []);

  // const refreshCategory = useRecoilCallback(
  //   ({ set }) =>
  //     async (refresh) => {
  //       setCardPropsCallback(DEFAULT_CARD_PROPS);
  //       if (refresh) {
  //         const categoryData = await getAllItem(COLLECTION_IDS.categories);
  //         set(allCategoryAtom, categoryData);
  //         const ids = [];
  //         for (const category of categoryData) {
  //           ids.push(category.$id);
  //           set(categoryAtomFamily(category.$id), category);
  //         }
  //         set(categoryIdsAtom, ids);
  //       }
  //     },
  //   []
  // );

  return (
    <Layout style={{ flex: 1, alignItems: "center" }}>
      <ScrollView
        style={styles.list as StyleProp<ViewStyle>}
        contentContainerStyle={styles.listContainer as StyleProp<ViewStyle>}
      >
        {categoryIds.map((id) => (
          <MemoizedCategoryCard
            key={id}
            categoryId={id}
            setCardPropsCallback={setCardPropsCallback}
          />
        ))}

        <Layout style={{ paddingBottom: 100 } as StyleProp<ViewStyle>}></Layout>
      </ScrollView>

      <FunctionCard
        cardProps={cardProps}
        setCardPropsCallback={setCardPropsCallback}
      />
    </Layout>
  );
};

interface TopTabBarProps extends MaterialTopTabBarProps {
  // Kế thừa tất cả props từ MaterialTopTabBarProps
}

const TopTabBar: React.FC<TopTabBarProps> = (props) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  return (
    <TabBar
      style={styles.topTabBar as ViewStyle}
      selectedIndex={props.state.index}
      onSelect={(index) =>
        props.navigation.navigate(props.state.routeNames[index])
      }
    >
      <Tab title={t("product")} />
      <Tab title={t("category")} />
    </TabBar>
  );
};

const TabNavigator = () => {
  const { t } = useTranslation();
  return (
    <Navigator
      tabBar={(props) => <TopTabBar {...props} />}
      screenOptions={{} as MaterialTopTabNavigationOptions}
    >
      <Screen name="ProductScreen" component={ProductScreen} />
      <Screen name="CategoryScreen" component={CategoryScreen} />
    </Navigator>
  );
};

const ManageProductScreen = () => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState("product");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const categories = useRecoilValue(allCategoryAtom);
  const [cardProps, setCardProps] = useState(DEFAULT_CARD_PROPS);
  const categoryIds = useRecoilValue(categoryIdsAtom);
  const { getAllItem } = useDatabases();

  // Hàm callback để cập nhật state cardProps
  const setCardPropsCallback = useCallback((props: any) => {
    setCardProps({
      method: props.method as "create" | "update" | "delete" | "cancel",
      visible: props.visible,
      itemInfo: props.itemInfo,
    });
  }, []);

  // Hàm refresh category
  const refreshCategory = useRecoilCallback(
    ({ set }) =>
      async (refresh: boolean) => {
        setCardPropsCallback(DEFAULT_CARD_PROPS);
        if (refresh) {
          const categoryData = await getAllItem(COLLECTION_IDS.categories);
          set(allCategoryAtom, categoryData);
          const ids: string[] = [];
          for (const category of categoryData) {
            ids.push(category.$id);
            set(categoryAtomFamily(category.$id), category);
          }
          set(categoryIdsAtom, ids);
        }
      },
    []
  );

  // Floating action buttons
  const getActionButtons = () => {
    if (activeTab === "product") {
      return [
        {
          text: t("create_product"),
          icon: require("../../assets/icons/plus-outline.png"),
          name: "CreateProductScreen",
          position: 1,
        },
      ];
    } else {
      return [
        {
          text: t("create_category"),
          icon: require("../../assets/icons/plus-outline.png"),
          name: "CreateCategoryScreen",
          position: 1,
        },
      ];
    }
  };

  // Tránh render category trong hàm chính - chuyển ra component riêng
  const CategoryCardItem = ({ id }: { id: string }) => {
    const [category] = useRecoilState(categoryAtomFamily(id));

    return (
      <Card
        style={styles.categoryCard as StyleProp<ViewStyle>}
        onPress={() =>
          setCardPropsCallback({
            method: "edit",
            visible: true,
            itemInfo: category,
          })
        }
      >
        <View style={styles.categoryCardContent as StyleProp<ViewStyle>}>
          <Icon
            style={styles.icon as StyleProp<ViewStyle>}
            name="clipboard-outline"
            fill={theme["color-info-800"]}
          />
          <Text style={styles.categoryName as StyleProp<TextStyle>}>
            {category.name}
          </Text>
        </View>
      </Card>
    );
  };

  return (
    <Layout style={styles.container as StyleProp<ViewStyle>}>
      {/* Tab Switcher */}
      <View style={styles.tabSwitcher as StyleProp<ViewStyle>}>
        <Button
          style={[
            styles.tabButton as StyleProp<ViewStyle>,
            activeTab === "product"
              ? (styles.activeTab as StyleProp<ViewStyle>)
              : null,
          ]}
          appearance={activeTab === "product" ? "filled" : "outline"}
          onPress={() => setActiveTab("product")}
        >
          {t("product")}
        </Button>
        <Button
          style={[
            styles.tabButton as StyleProp<ViewStyle>,
            activeTab === "category"
              ? (styles.activeTab as StyleProp<ViewStyle>)
              : null,
          ]}
          appearance={activeTab === "category" ? "filled" : "outline"}
          onPress={() => setActiveTab("category")}
        >
          {t("category")}
        </Button>
      </View>

      <Divider />

      {/* Category Scrollbar */}
      {activeTab === "product" && categories && categories.length > 0 && (
        <CategoryScrollbar
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
      )}

      {/* Content Area */}
      {activeTab === "product" ? (
        <ProductList
          screen="manage"
          editable={true}
          category={selectedCategory}
        />
      ) : cardProps.visible ? (
        <CreatePropsCard
          collection={COLLECTION_IDS.categories}
          method={cardProps.method}
          onFinished={(refresh) => refreshCategory(refresh)}
          itemInfo={cardProps.itemInfo}
        />
      ) : (
        <ScrollView
          style={styles.categoryList as StyleProp<ViewStyle>}
          contentContainerStyle={
            styles.categoryListContainer as StyleProp<ViewStyle>
          }
        >
          {categoryIds.length > 0 ? (
            categoryIds.map((id) => <CategoryCardItem key={id} id={id} />)
          ) : (
            <Text style={styles.emptyStateText as StyleProp<TextStyle>}>
              {t("no_categories_found")}
            </Text>
          )}
          <View style={{ paddingBottom: 100 }} />
        </ScrollView>
      )}

      {/* Floating Action Button */}
      {!cardProps.visible && (
        <FloatingAction
          actions={getActionButtons()}
          overrideWithAction={true}
          showBackground={false}
          onPressItem={(screenName) => {
            if (screenName === "CreateProductScreen") {
              RootNavigation.navigate(screenName, {
                title: t("create_product"),
                method: "create",
              });
            } else {
              setCardPropsCallback({
                method: "create",
                visible: true,
                itemInfo: DEFAULT_CARD_PROPS.itemInfo,
              });
            }
          }}
        />
      )}
    </Layout>
  );
};

// StyleSheet với kiểu rõ ràng
// Thêm các thuộc tính thiếu vào StyleSheet
const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-1",
  } as ViewStyle,
  tabSwitcher: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "background-basic-color-1",
  } as ViewStyle,
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 4,
  } as ViewStyle,
  activeTab: {
    borderWidth: 0,
  } as ViewStyle,
  searchInput: {
    margin: 16,
    borderRadius: 8,
  } as ViewStyle,
  categoryList: {
    flex: 1,
    width: "100%",
  } as ViewStyle,
  categoryListContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  } as ViewStyle,
  categoryCard: {
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  } as ViewStyle,
  categoryCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  } as ViewStyle,
  categoryName: {
    marginLeft: 12,
    fontWeight: "500",
  } as TextStyle,
  icon: {
    width: 24,
    height: 24,
  } as ViewStyle,
  emptyStateText: {
    textAlign: "center",
    marginTop: 40,
    opacity: 0.6,
  } as TextStyle,
  // Thêm các thuộc tính bị thiếu
  list: {
    width: "100%",
  } as ViewStyle,
  listContainer: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    paddingBottom: 100,
  } as ViewStyle,
  topTabBar: {
    height: 50,
  } as ViewStyle,
});

export default ManageProductScreen;
