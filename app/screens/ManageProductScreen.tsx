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
import { LinearGradient } from "expo-linear-gradient";

const { Navigator, Screen } = createMaterialTopTabNavigator();
const { width } = Dimensions.get("window");

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
    <Layout style={styles.productScreenContainer as ViewStyle}>
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
        color="#6C5CE7"
        floatingIcon={
          <Icon
            name="plus-outline"
            fill="#FFFFFF"
            style={styles.floatingActionIcon}
          />
        }
        buttonSize={60}
        iconHeight={20}
        iconWidth={20}
        distanceToEdge={16}
        overlayColor="rgba(0, 0, 0, 0.7)"
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
  const styles = useStyleSheet(styleSheet);

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
      color="#6C5CE7"
      floatingIcon={
        <Icon
          name="plus-outline"
          fill="#FFFFFF"
          style={styles.floatingActionIcon}
        />
      }
      buttonSize={60}
      iconHeight={20}
      iconWidth={20}
      distanceToEdge={16}
      overlayColor="rgba(0, 0, 0, 0.7)"
      onPressItem={(screenName) => {
        console.log(`selected button:: ${screenName}`);
        setCardPropsCallback({
          method: DEFAULT_CARD_PROPS.method,
          visible: true,
          itemInfo: DEFAULT_CARD_PROPS.itemInfo,
        });
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
      style={styles.categoryCard as StyleProp<ViewStyle>}
    >
      <LinearGradient
        colors={["rgba(108, 92, 231, 0.1)", "rgba(108, 92, 231, 0.05)"]}
        style={styles.cardGradient as StyleProp<ViewStyle>}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.categoryCardContent as StyleProp<ViewStyle>}>
        <View style={styles.categoryIconContainer as StyleProp<ViewStyle>}>
          <Icon
            style={styles.categoryIcon}
            name="folder-outline"
            fill={theme["color-primary-500"]}
          />
        </View>
        <Text style={styles.categoryName as TextStyle}>{category.name}</Text>
        <Icon
          style={styles.editIcon}
          name="edit-2-outline"
          fill={theme["color-primary-400"]}
        />
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
  const [cardProps, setCardProps] = useState(DEFAULT_CARD_PROPS);
  const categoryIds = useRecoilValue(categoryIdsAtom);
  const theme = useTheme();

  const setCardPropsCallback = useCallback((props: any) => {
    setCardProps((prev) => ({
      method: props.method,
      visible: props.visible,
      itemInfo: props.itemInfo,
    }));
  }, []);

  return (
    <Layout style={styles.categoryScreenContainer as ViewStyle}>
      {!cardProps.visible && categoryIds.length === 0 && (
        <View style={styles.emptyCategoryContainer as ViewStyle}>
          <Icon
            name="folder-outline"
            fill={theme["color-basic-400"]}
            style={styles.emptyStateIcon}
          />
          <Text style={styles.emptyStateText as TextStyle}>
            {t("no_categories_found")}
          </Text>
          <Button
            style={styles.createFirstCategoryButton as ViewStyle}
            status="primary"
            appearance="outline"
            accessoryLeft={(props) => <Icon {...props} name="plus-outline" />}
            onPress={() =>
              setCardPropsCallback({
                method: "create",
                visible: true,
                itemInfo: DEFAULT_CARD_PROPS.itemInfo,
              })
            }
          >
            {t("create_category")}
          </Button>
        </View>
      )}

      {!cardProps.visible && categoryIds.length > 0 && (
        <ScrollView
          style={styles.categoryList as StyleProp<ViewStyle>}
          contentContainerStyle={
            styles.categoryListContainer as StyleProp<ViewStyle>
          }
          showsVerticalScrollIndicator={false}
        >
          {categoryIds.map((id) => (
            <MemoizedCategoryCard
              key={id}
              categoryId={id}
              setCardPropsCallback={setCardPropsCallback}
            />
          ))}
          <View style={{ paddingBottom: 100 }} />
        </ScrollView>
      )}

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
      indicatorStyle={styles.tabIndicator as ViewStyle}
    >
      <Tab
        title={() => (
          <Text
            style={
              props.state.index === 0
                ? (styles.activeTabText as TextStyle)
                : (styles.tabText as TextStyle)
            }
          >
            {t("product")}
          </Text>
        )}
      />
      <Tab
        title={() => (
          <Text
            style={
              props.state.index === 1
                ? (styles.activeTabText as TextStyle)
                : (styles.tabText as TextStyle)
            }
          >
            {t("category")}
          </Text>
        )}
      />
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
        <LinearGradient
          colors={["rgba(108, 92, 231, 0.1)", "rgba(108, 92, 231, 0.05)"]}
          style={styles.cardGradient as StyleProp<ViewStyle>}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.categoryCardContent as StyleProp<ViewStyle>}>
          <View style={styles.categoryIconContainer as StyleProp<ViewStyle>}>
            <Icon
              style={styles.categoryIcon}
              name="folder-outline"
              fill={theme["color-primary-500"]}
            />
          </View>
          <Text style={styles.categoryName as TextStyle}>{category.name}</Text>
          <Icon
            style={styles.editIcon}
            name="edit-2-outline"
            fill={theme["color-primary-400"]}
          />
        </View>
      </Card>
    );
  };

  return (
    <Layout style={styles.container as ViewStyle}>
      {/* Header with modern tab switcher */}
      <View style={styles.header as ViewStyle}>
        <View style={styles.tabSwitcher as ViewStyle}>
          <Button
            style={
              [
                styles.tabButton,
                activeTab === "product" ? styles.activeTab : null,
              ] as StyleProp<ViewStyle>
            }
            appearance={activeTab === "product" ? "filled" : "ghost"}
            status="primary"
            onPress={() => setActiveTab("product")}
            accessoryLeft={
              activeTab === "product"
                ? (props) => <Icon {...props} name="cube" />
                : (props) => <Icon {...props} name="cube-outline" />
            }
          >
            {t("product")}
          </Button>
          <Button
            style={
              [
                styles.tabButton,
                activeTab === "category" ? styles.activeTab : null,
              ] as StyleProp<ViewStyle>
            }
            appearance={activeTab === "category" ? "filled" : "ghost"}
            status="primary"
            onPress={() => setActiveTab("category")}
            accessoryLeft={
              activeTab === "category"
                ? (props) => <Icon {...props} name="folder" />
                : (props) => <Icon {...props} name="folder-outline" />
            }
          >
            {t("category")}
          </Button>
        </View>
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
          showsVerticalScrollIndicator={false}
        >
          {categoryIds.length > 0 ? (
            categoryIds.map((id) => <CategoryCardItem key={id} id={id} />)
          ) : (
            <View style={styles.emptyCategoryContainer as ViewStyle}>
              <Icon
                name="folder-outline"
                fill={theme["color-basic-400"]}
                style={styles.emptyStateIcon}
              />
              <Text style={styles.emptyStateText as TextStyle}>
                {t("no_categories_found")}
              </Text>
              <Button
                style={styles.createFirstCategoryButton as ViewStyle}
                status="primary"
                appearance="outline"
                accessoryLeft={(props) => (
                  <Icon {...props} name="plus-outline" />
                )}
                onPress={() =>
                  setCardPropsCallback({
                    method: "create",
                    visible: true,
                    itemInfo: DEFAULT_CARD_PROPS.itemInfo,
                  })
                }
              >
                {t("create_category")}
              </Button>
            </View>
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
          color="#6C5CE7"
          floatingIcon={
            <Icon
              name="plus-outline"
              fill="#FFFFFF"
              style={styles.floatingActionIcon}
            />
          }
          buttonSize={60}
          iconHeight={20}
          iconWidth={20}
          distanceToEdge={16}
          overlayColor="rgba(0, 0, 0, 0.7)"
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

// StyleSheet với kiểu rõ ràng và thiết kế hiện đại
const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-1",
  } as ViewStyle,

  // Header styles
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "background-basic-color-1",
    borderBottomWidth: 1,
    borderBottomColor: "border-basic-color-3",
  } as ViewStyle,

  headerTitle: {
    marginBottom: 16,
    fontWeight: "bold",
    color: "text-primary-color",
  } as TextStyle,

  // Tab switcher styles
  tabSwitcher: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    backgroundColor: "background-basic-color-2",
    elevation: 2,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  } as ViewStyle,

  tabButton: {
    flex: 1,
    borderRadius: 8,
    marginHorizontal: 2,
    borderWidth: 0,
    paddingVertical: 12,
  } as ViewStyle,

  activeTab: {
    backgroundColor: "color-primary-500",
  } as ViewStyle,

  // Material tab bar styles
  topTabBar: {
    elevation: 8,
    shadowColor: "rgba(0, 0, 0, 0.15)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    height: 56,
    backgroundColor: "background-basic-color-1",
    borderBottomWidth: 0,
  } as ViewStyle,

  tabIndicator: {
    backgroundColor: "color-primary-500",
    height: 3,
    borderRadius: 3,
  } as ViewStyle,

  tabText: {
    fontWeight: "normal",
    fontSize: 14,
    color: "text-hint-color",
  } as TextStyle,

  activeTabText: {
    fontWeight: "bold",
    fontSize: 14,
    color: "text-primary-color",
  } as TextStyle,

  // Category styles
  categoryList: {
    flex: 1,
    width: "100%",
  } as ViewStyle,

  categoryListContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  } as ViewStyle,

  categoryCard: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 4,
    elevation: 4,
    shadowColor: "rgba(0, 0, 0, 0.15)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    backgroundColor: "background-basic-color-1",
    borderWidth: 0,
    overflow: "hidden",
  } as ViewStyle,

  cardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,

  categoryCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  } as ViewStyle,

  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "color-primary-100",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  } as ViewStyle,

  categoryIcon: {
    width: 20,
    height: 20,
  } as ViewStyle,

  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "text-basic-color",
  } as TextStyle,

  editIcon: {
    width: 20,
    height: 20,
  } as ViewStyle,

  // Empty state styles
  emptyCategoryContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  } as ViewStyle,

  emptyStateIcon: {
    width: 80,
    height: 80,
    opacity: 0.5,
    marginBottom: 16,
  } as ViewStyle,

  emptyStateText: {
    textAlign: "center",
    fontSize: 16,
    color: "text-hint-color",
    marginBottom: 24,
  } as TextStyle,

  createFirstCategoryButton: {
    borderRadius: 24,
    paddingHorizontal: 20,
  } as ViewStyle,

  // Product screen styles
  productScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "background-basic-color-1",
  } as ViewStyle,

  categoryScreenContainer: {
    flex: 1,
    backgroundColor: "background-basic-color-1",
  } as ViewStyle,

  // Floating action button
  floatingActionIcon: {
    width: 26,
    height: 26,
  } as ViewStyle,

  // Various helpers
  searchInput: {
    margin: 16,
    borderRadius: 24,
    backgroundColor: "background-basic-color-1",
    borderColor: "border-basic-color-3",
  } as ViewStyle,

  icon: {
    width: 24,
    height: 24,
  } as ViewStyle,

  list: {
    width: "100%",
  } as ViewStyle,

  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  } as ViewStyle,
});

export default ManageProductScreen;
