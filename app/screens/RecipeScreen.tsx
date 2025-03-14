import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  Alert,
  ViewStyle,
  RefreshControl,
  TextStyle,
} from "react-native";
import {
  Layout,
  Text,
  Card,
  Button,
  Icon,
  Divider,
  Spinner,
  useTheme,
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { useTranslation } from "react-i18next";
import { FloatingAction } from "react-native-floating-action";
import { Query } from "appwrite";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

// Interface cũ giữ nguyên
interface Ingredient {
  productId: string;
  name: string;
  quantity: number;
}

interface Output {
  productId: string;
  name: string;
  quantity: number;
}

interface Recipe {
  $id: string;
  name: string;
  description?: string;
  ingredients: Ingredient[];
  output: Output;
}

interface Product {
  $id: string;
  name: string;
  stock?: number;
}

// Định nghĩa kiểu cho navigation
type RootStackParamList = {
  RecipeScreen: undefined;
  CreateRecipeScreen: undefined;
  EditRecipeScreen: { recipe: Recipe };
};

type RecipeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, "RecipeScreen">;
};

const RecipeScreen: React.FC<RecipeScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { getAllItem, getSingleItem, updateItem, createItem } = useDatabases();
  const theme = useTheme();
  const styles = useStyleSheet(themedStyles);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRecipes();
  }, []);

  // Logic loadRecipes giữ nguyên
  const loadRecipes = async () => {
    setLoading(true);
    try {
      console.log("Đang tải dữ liệu công thức...");
      const recipeData = await getAllItem(COLLECTION_IDS.recipes);
      console.log("Dữ liệu thô từ Appwrite:", JSON.stringify(recipeData));

      // Kiểm tra xem có dữ liệu nào không
      if (!recipeData || recipeData.length === 0) {
        console.log("Không có dữ liệu công thức");
        setRecipes([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Kiểm tra cấu trúc dữ liệu
      console.log(
        "Cấu trúc dữ liệu công thức đầu tiên:",
        JSON.stringify(recipeData[0])
      );

      // Thử chuyển đổi dữ liệu
      try {
        // Chuyển đổi dữ liệu
        const processedRecipes = recipeData
          .map((recipe) => {
            console.log("Đang xử lý công thức:", recipe.name);

            // Kiểm tra ingredients
            if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
              console.log(
                "Lỗi: ingredients không phải là mảng hoặc không tồn tại"
              );
              return null;
            }

            // Kiểm tra output
            if (!recipe.output) {
              console.log("Lỗi: output không tồn tại");
              return null;
            }

            try {
              const ingredientsArray = recipe.ingredients.map(
                (ingredientStr: any) => {
                  console.log("Đang xử lý nguyên liệu chuỗi:", ingredientStr);
                  const parts = ingredientStr.split(":");
                  if (parts.length < 3) {
                    console.log(
                      "Chuỗi nguyên liệu không hợp lệ:",
                      ingredientStr
                    );
                    return {
                      productId: "unknown",
                      name: ingredientStr || "Unknown",
                      quantity: 0,
                    };
                  }

                  const [productId, name, quantityStr] = parts;
                  return {
                    productId,
                    name,
                    quantity: parseInt(quantityStr) || 0,
                  };
                }
              );

              let outputObject;
              if (typeof recipe.output === "string") {
                console.log("Output là chuỗi:", recipe.output);
                const parts = recipe.output.split(":");
                if (parts.length < 3) {
                  console.log("Chuỗi output không hợp lệ");
                  outputObject = {
                    productId: "unknown",
                    name: recipe.output || "Unknown",
                    quantity: 0,
                  };
                } else {
                  const [productId, name, quantityStr] = parts;
                  outputObject = {
                    productId,
                    name,
                    quantity: parseInt(quantityStr) || 0,
                  };
                }
              } else if (Array.isArray(recipe.output)) {
                console.log("Output là mảng:", JSON.stringify(recipe.output));
                if (recipe.output.length > 0) {
                  const parts = recipe.output[0].split(":");
                  if (parts.length < 3) {
                    outputObject = {
                      productId: "unknown",
                      name: recipe.output[0] || "Unknown",
                      quantity: 0,
                    };
                  } else {
                    const [productId, name, quantityStr] = parts;
                    outputObject = {
                      productId,
                      name,
                      quantity: parseInt(quantityStr) || 0,
                    };
                  }
                } else {
                  outputObject = {
                    productId: "unknown",
                    name: "Unknown",
                    quantity: 0,
                  };
                }
              } else {
                console.log(
                  "Output có định dạng không xác định:",
                  typeof recipe.output
                );
                outputObject = {
                  productId: "unknown",
                  name: "Unknown",
                  quantity: 0,
                };
              }

              return {
                ...recipe,
                ingredients: ingredientsArray,
                output: outputObject,
              };
            } catch (conversionError) {
              console.error("Lỗi khi chuyển đổi dữ liệu:", conversionError);
              return null;
            }
          })
          .filter((recipe) => recipe !== null);

        console.log("Đã xử lý xong:", processedRecipes.length, "công thức");
        setRecipes(processedRecipes);
      } catch (processingError) {
        console.error("Lỗi khi xử lý dữ liệu:", processingError);
        setRecipes([]);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu từ Appwrite:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRecipes();
  };

  useFocusEffect(
    React.useCallback(() => {
      console.log("Màn hình RecipeScreen được focus - tải lại dữ liệu");
      loadRecipes();
      return () => {};
    }, [])
  );

  // Thiết kế lại renderRecipeItem với UI hiện đại hơn
  const renderRecipeItem = ({ item }: { item: Recipe }) => (
    <Card
      style={styles.recipeCard as ViewStyle}
      onPress={() => navigation.navigate("EditRecipeScreen", { recipe: item })}
    >
      <LinearGradient
        colors={["#6A11CB", "#2575FC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardHeader as ViewStyle}
      >
        <Text category="h6" style={styles.cardTitle as TextStyle}>
          {item.name}
        </Text>
      </LinearGradient>

      {item.description ? (
        <Text appearance="hint" style={styles.description as TextStyle}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.contentSection as ViewStyle}>
        <Text category="s1" style={styles.sectionTitle as TextStyle}>
          {t("ingredients")}:
        </Text>
        <View style={styles.ingredientsList as ViewStyle}>
          {item.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientItem as ViewStyle}>
              <Icon
                name="cube-outline"
                fill={theme["color-primary-500"]}
                style={styles.itemIcon}
              />
              <Text category="p2" style={styles.ingredientText as TextStyle}>
                {ingredient.name}
              </Text>
              <View style={styles.quantityBadge as ViewStyle}>
                <Text style={styles.quantityText as TextStyle}>
                  x{ingredient.quantity}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Divider style={styles.divider as ViewStyle} />

      <View style={styles.outputSection as ViewStyle}>
        <Text category="s1" style={styles.sectionTitle as TextStyle}>
          {t("output")}:
        </Text>
        <View style={styles.outputContainer as ViewStyle}>
          <Icon
            name="checkmark-circle-2-outline"
            fill={theme["color-success-500"]}
            style={styles.outputIcon}
          />
          <Text category="s1" style={styles.outputText as TextStyle}>
            {item.output.name}
          </Text>
          <View style={styles.outputQuantityBadge as ViewStyle}>
            <Text style={styles.outputQuantityText as TextStyle}>
              x{item.output.quantity}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );

  // FloatingAction component thêm màu sắc
  const actions = [
    {
      text: t("create_recipe"),
      icon: require("../../assets/icons/plus-outline.png"),
      name: "create_recipe",
      position: 1,
      color: "#4169E1",
    },
  ];

  // Thiết kế lại UI cho trạng thái không có công thức
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer as ViewStyle}>
      <Icon
        name="book-outline"
        fill={theme["color-basic-500"]}
        style={styles.emptyIcon}
      />
      <Text category="h6" style={styles.emptyTitle as TextStyle}>
        {t("no_recipes_yet")}
      </Text>
      <Text appearance="hint" style={styles.emptyText as TextStyle}>
        {t("create_your_first_recipe")}
      </Text>
      <Button
        style={styles.createButton as ViewStyle}
        status="primary"
        accessoryLeft={(props) => <Icon {...props} name="plus-outline" />}
        onPress={() => navigation.navigate("CreateRecipeScreen")}
      >
        {t("create_recipe")}
      </Button>
    </View>
  );

  return (
    <Layout style={styles.container as ViewStyle}>
      {loading && !refreshing ? (
        <View style={styles.loadingContainer as ViewStyle}>
          <Spinner size="large" status="primary" />
          <Text category="s1" style={styles.loadingText as TextStyle}>
            {t("loading_recipes")}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={recipes}
            renderItem={renderRecipeItem}
            keyExtractor={(item) => item.$id}
            ListEmptyComponent={renderEmptyComponent}
            contentContainerStyle={styles.listContainer as ViewStyle}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />

          <FloatingAction
            actions={actions}
            color="#4169E1"
            overlayColor="rgba(0, 0, 0, 0.7)"
            onPressItem={(name) => {
              if (name === "create_recipe") {
                navigation.navigate("CreateRecipeScreen");
              }
            }}
            distanceToEdge={16}
          />
        </>
      )}
    </Layout>
  );
};

// Styles mới cho giao diện hiện đại
const themedStyles = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-2",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "text-hint-color",
  },
  recipeCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    padding: 0,
  },
  cardHeader: {
    padding: 16,
  },
  cardTitle: {
    color: "white",
    fontWeight: "bold",
  },
  description: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "border-basic-color-3",
  },
  contentSection: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 8,
    color: "text-basic-color",
  },
  ingredientsList: {
    marginBottom: 4,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  itemIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  ingredientText: {
    flex: 1,
  },
  quantityBadge: {
    backgroundColor: "color-basic-200",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "text-basic-color",
  },
  divider: {
    marginHorizontal: 16,
  },
  outputSection: {
    padding: 16,
    paddingTop: 12,
  },
  outputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "color-success-100",
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  outputIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  outputText: {
    flex: 1,
    fontWeight: "bold",
    color: "color-success-800",
  },
  outputQuantityBadge: {
    backgroundColor: "color-success-200",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  outputQuantityText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "color-success-800",
  },
  applyButton: {
    margin: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    marginBottom: 24,
  },
  createButton: {
    minWidth: 160,
  },
});

export default RecipeScreen;
