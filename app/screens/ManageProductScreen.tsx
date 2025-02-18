import React, { useEffect, useState, useCallback, memo } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Dimensions,
  ScrollView,
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

const { Navigator, Screen } = createMaterialTopTabNavigator();

const DEFAULT_CARD_PROPS = {
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

const FunctionCard = ({
  cardProps,
  setCardPropsCallback,
}): React.ReactElement => {
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
}): React.ReactElement => {
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
      style={styles.categoryCard}
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

  const setCardPropsCallback = useCallback((props) => {
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
        style={styles.list}
        contentContainerStyle={styles.listContainer}
      >
        {categoryIds.map((id) => (
          <MemoizedCategoryCard
            key={id}
            categoryId={id}
            setCardPropsCallback={setCardPropsCallback}
          />
        ))}

        <Layout style={{ paddingBottom: 100 }}></Layout>
      </ScrollView>

      <FunctionCard
        cardProps={cardProps}
        setCardPropsCallback={setCardPropsCallback}
      />
    </Layout>
  );
};

const TopTabBar = ({ navigation, state }) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  return (
    <TabBar
      style={styles.topTabBar}
      selectedIndex={state.index}
      onSelect={(index) => navigation.navigate(state.routeNames[index])}
    >
      <Tab title={t("product")} />
      <Tab title={t("category")} />
    </TabBar>
  );
};

const TabNavigator = () => {
  const { t } = useTranslation();
  return (
    <Navigator tabBar={(props) => <TopTabBar {...props} />}>
      <Screen name="ProductScreen" component={ProductScreen} />
      <Screen name="CategoryScreen" component={CategoryScreen} />
    </Navigator>
  );
};

const ManageProductScreen = ({ navigation }) => {
  const styles = useStyleSheet(styleSheet);
  return (
    <View style={styles.container}>
      <TabNavigator />
    </View>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  list: {
    width: "100%",
    // maxHeight: 320,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    paddingBottom: 100,
  },
  categoryCard: {
    borderRadius: 5,
    margin: 5,
    elevation: 2,
  },
  topTabBar: {
    height: 50,
  },
  icon: {
    width: 20,
    height: 20,
  },
});

export default ManageProductScreen;
