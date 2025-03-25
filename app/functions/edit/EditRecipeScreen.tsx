import React, { useState, useEffect } from "react";
import { View, ScrollView, Alert, ViewStyle, TextStyle } from "react-native";
import {
  Layout,
  Text,
  Input,
  Button,
  Card,
  Select,
  SelectItem,
  Icon,
  IndexPath,
  Divider,
  Spinner,
  StyleService,
  useStyleSheet,
  useTheme,
} from "@ui-kitten/components";
import { useDatabases, COLLECTION_IDS } from "../../hook/AppWrite";
import { useTranslation } from "react-i18next";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

// Định nghĩa kiểu dữ liệu (giữ nguyên)
interface Product {
  $id: string;
  name: string;
  price?: number;
}

interface WarehouseItem {
  $id: string;
  productName: string;
  quantity: number;
}

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

// Định nghĩa kiểu dữ liệu cho props
type RootStackParamList = {
  EditRecipeScreen: { recipe: Recipe };
  // Thêm các màn hình khác nếu cần
};

type EditRecipeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, "EditRecipeScreen">;
  route: RouteProp<RootStackParamList, "EditRecipeScreen">;
};

const EditRecipeScreen: React.FC<EditRecipeScreenProps> = ({
  navigation,
  route,
}) => {
  const { t } = useTranslation();
  const { getAllItem, updateItem, deleteItem } = useDatabases();
  const { recipe } = route.params;
  const theme = useTheme();
  const styles = useStyleSheet(themedStyles);

  // State giữ nguyên
  const [recipeName, setRecipeName] = useState(recipe.name || "");
  const [description, setDescription] = useState(recipe.description || "");
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe.ingredients || []
  );
  const [outputProduct, setOutputProduct] = useState<Output>(
    recipe.output || null
  );
  const [outputQuantity, setOutputQuantity] = useState(
    (recipe.output?.quantity || 1).toString()
  );

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState("1");
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [selectedIngredientIndex, setSelectedIngredientIndex] = useState<
    IndexPath | undefined
  >(undefined);
  const [outputProductIndex, setOutputProductIndex] = useState<
    IndexPath | undefined
  >(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Logic giữ nguyên
  useEffect(() => {
    loadWarehouseItems();
    loadProducts();
  }, []);

  const loadWarehouseItems = async () => {
    try {
      const items = await getAllItem(COLLECTION_IDS.warehouse);
      setWarehouseItems(items);
    } catch (error) {
      console.error("Lỗi khi tải kho hàng:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const products = await getAllItem(COLLECTION_IDS.products);
      setAllProducts(products);
    } catch (error) {
      console.error("Lỗi khi tải sản phẩm:", error);
    }
  };

  const addIngredient = () => {
    if (!selectedProduct) {
      Alert.alert(t("error"), t("select_product_first"));
      return;
    }

    const quantity = parseInt(selectedQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert(t("error"), t("invalid_quantity"));
      return;
    }

    setIngredients([
      ...ingredients,
      {
        productId: selectedProduct.$id,
        name: selectedProduct.name,
        quantity: quantity,
      },
    ]);

    setSelectedProduct(null);
    setSelectedQuantity("1");
    setSelectedIngredientIndex(undefined);
  };

  const removeIngredient = (index: number) => {
    const newIngredients = [...ingredients];
    newIngredients.splice(index, 1);
    setIngredients(newIngredients);
  };

  const handleUpdateRecipe = async () => {
    if (!recipeName.trim()) {
      Alert.alert(t("error"), t("recipe_name_required"));
      return;
    }

    if (ingredients.length === 0) {
      Alert.alert(t("error"), t("ingredients_required"));
      return;
    }

    if (!outputProduct) {
      Alert.alert(t("error"), t("output_product_required"));
      return;
    }

    setIsLoading(true);

    try {
      // Chuyển đổi danh sách nguyên liệu thành mảng chuỗi JSON
      const ingredientsArray = ingredients.map(
        (ingredient) =>
          `${ingredient.productId}:${ingredient.name}:${ingredient.quantity}`
      );

      // Cập nhật outputProduct với số lượng hiện tại
      const updatedOutput = {
        ...outputProduct,
        quantity: parseInt(outputQuantity) || 1,
      };

      const outputArray = [
        `${updatedOutput.productId}:${updatedOutput.name}:${updatedOutput.quantity}`,
      ];

      await updateItem(COLLECTION_IDS.recipes, recipe.$id, {
        name: recipeName.trim(),
        description: description.trim(),
        ingredients: ingredientsArray,
        output: outputArray,
      });

      Alert.alert(t("success"), t("recipe_updated_successfully"), [
        { text: t("ok"), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Lỗi khi cập nhật công thức:", error);
      Alert.alert(t("error"), t("update_recipe_error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecipe = () => {
    Alert.alert(
      t("confirm_delete"),
      t("delete_recipe_confirmation").replace("{name}", recipeName),
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: t("delete"),
          style: "destructive",
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteItem(COLLECTION_IDS.recipes, recipe.$id);
      Alert.alert(t("success"), t("recipe_deleted_successfully"), [
        { text: t("ok"), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Lỗi khi xóa công thức:", error);
      Alert.alert(t("error"), t("delete_recipe_error"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleIngredientSelect = (index: IndexPath) => {
    setSelectedIngredientIndex(index);
    if (index.row < warehouseItems.length) {
      const item = warehouseItems[index.row];
      // Tìm sản phẩm tương ứng
      const product = allProducts.find((p) => p.name === item.productName);
      setSelectedProduct(
        product || {
          $id: item.$id,
          name: item.productName,
        }
      );
    }
  };

  const handleOutputProductSelect = (index: IndexPath) => {
    setOutputProductIndex(index);
    if (index.row < allProducts.length) {
      const product = allProducts[index.row];
      setOutputProduct({
        productId: product.$id,
        name: product.name,
        quantity: parseInt(outputQuantity) || 1,
      });
    }
  };

  return (
    <Layout style={styles.container as ViewStyle}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={["#6A11CB", "#2575FC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header as ViewStyle}
        >
          <Text category="h5" style={styles.headerTitle as TextStyle}>
            {t("edit_recipe")}
          </Text>
        </LinearGradient>

        <Card style={styles.formCard as ViewStyle}>
          {/* Thông tin cơ bản */}
          <View style={styles.section as ViewStyle}>
            <Text category="s1" style={styles.sectionTitle as TextStyle}>
              {t("basic_info")}
            </Text>

            <Input
              label={t("recipe_name")}
              placeholder={t("enter_recipe_name")}
              value={recipeName}
              onChangeText={setRecipeName}
              style={styles.input as TextStyle}
              size="large"
              status="primary"
            />

            <Input
              label={t("description")}
              placeholder={t("enter_description")}
              value={description}
              onChangeText={setDescription}
              style={styles.input as TextStyle}
              multiline
              textStyle={styles.multilineText as TextStyle}
            />
          </View>

          <Divider style={styles.divider as ViewStyle} />

          {/* Danh sách nguyên liệu */}
          <View style={styles.section as ViewStyle}>
            <Text category="s1" style={styles.sectionTitle as TextStyle}>
              {t("ingredients")}
            </Text>

            {ingredients.length > 0 ? (
              <View style={styles.ingredientsList as ViewStyle}>
                {ingredients.map((item, index) => (
                  <Card key={index} style={styles.ingredientCard as ViewStyle}>
                    <View style={styles.ingredientRow as ViewStyle}>
                      <View style={styles.ingredientInfo as ViewStyle}>
                        <Icon
                          name="cube-outline"
                          fill={theme["color-primary-500"]}
                          style={styles.ingredientIcon}
                        />
                        <Text>{item.name}</Text>
                      </View>

                      <View style={styles.quantityContainer as ViewStyle}>
                        <View style={styles.quantityBadge as ViewStyle}>
                          <Text style={styles.quantityText as TextStyle}>
                            x{item.quantity}
                          </Text>
                        </View>

                        <Button
                          size="small"
                          status="danger"
                          appearance="ghost"
                          accessoryLeft={(props) => (
                            <Icon {...props} name="trash-outline" />
                          )}
                          onPress={() => removeIngredient(index)}
                        />
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            ) : (
              <Text appearance="hint" style={styles.emptyText as TextStyle}>
                {t("no_ingredients_added")}
              </Text>
            )}

            {/* Thêm nguyên liệu */}
            <Card style={styles.addIngredientCard as ViewStyle}>
              <Text category="s2" style={styles.addTitle as TextStyle}>
                {t("add_ingredient")}
              </Text>

              <View style={styles.selectRow as ViewStyle}>
                <Select
                  placeholder={t("select_ingredient")}
                  selectedIndex={selectedIngredientIndex}
                  onSelect={(index: IndexPath | IndexPath[]) => {
                    if (index instanceof IndexPath) {
                      handleIngredientSelect(index);
                    }
                  }}
                  value={selectedProduct?.name || ""}
                  style={styles.selectIngredient as ViewStyle}
                >
                  {warehouseItems.map((item) => (
                    <SelectItem key={item.$id} title={item.productName} />
                  ))}
                </Select>

                <Input
                  placeholder={t("qty")}
                  keyboardType="numeric"
                  value={selectedQuantity}
                  onChangeText={setSelectedQuantity}
                  style={styles.quantityInput as TextStyle}
                />
              </View>

              <Button
                status="primary"
                size="small"
                onPress={addIngredient}
                style={styles.addButton as ViewStyle}
                accessoryLeft={(props) => (
                  <Icon {...props} name="plus-outline" />
                )}
              >
                {t("add")}
              </Button>
            </Card>
          </View>

          <Divider style={styles.divider as ViewStyle} />

          {/* Sản phẩm đầu ra */}
          <View style={styles.section as ViewStyle}>
            <Text category="s1" style={styles.sectionTitle as TextStyle}>
              {t("output_product")}
            </Text>

            <Card style={styles.outputCard as ViewStyle}>
              <View style={styles.selectRow as ViewStyle}>
                <Select
                  label={t("select_product")}
                  placeholder={t("select_product")}
                  selectedIndex={outputProductIndex}
                  onSelect={(index: IndexPath | IndexPath[]) => {
                    if (index instanceof IndexPath) {
                      handleOutputProductSelect(index);
                    }
                  }}
                  value={outputProduct?.name || ""}
                  style={styles.selectOutput as ViewStyle}
                  disabled={isLoading}
                >
                  {allProducts.map((product) => (
                    <SelectItem key={product.$id} title={product.name} />
                  ))}
                </Select>

                <Input
                  label={t("quantity")}
                  keyboardType="numeric"
                  value={outputQuantity}
                  onChangeText={setOutputQuantity}
                  style={styles.outputQuantityInput as TextStyle}
                  disabled={isLoading}
                />
              </View>

              {outputProduct && (
                <View style={styles.outputPreview as ViewStyle}>
                  <Icon
                    name="checkmark-circle-2-outline"
                    fill={theme["color-success-500"]}
                    style={styles.outputIcon}
                  />
                  <Text style={styles.outputText as TextStyle}>
                    {t("output_will_be")}
                  </Text>
                  <View style={styles.outputProductBadge as ViewStyle}>
                    <Text style={styles.outputProductText as TextStyle}>
                      {outputProduct.name} x{outputQuantity}
                    </Text>
                  </View>
                </View>
              )}
            </Card>
          </View>
        </Card>

        {/* Nút điều khiển */}
        <View style={styles.buttonContainer as ViewStyle}>
          <Button
            status="danger"
            style={styles.deleteButton as ViewStyle}
            onPress={handleDeleteRecipe}
            disabled={isLoading || isDeleting}
            accessoryLeft={
              isDeleting
                ? (props) => <Spinner size="small" />
                : (props) => <Icon {...props} name="trash-2-outline" />
            }
          >
            {isDeleting ? t("deleting") : t("delete_recipe")}
          </Button>

          <Button
            status="primary"
            style={styles.updateButton as ViewStyle}
            onPress={handleUpdateRecipe}
            disabled={isLoading || isDeleting}
            accessoryLeft={
              isLoading
                ? (props) => <Spinner size="small" />
                : (props) => <Icon {...props} name="save-outline" />
            }
          >
            {isLoading ? t("updating") : t("update_recipe")}
          </Button>
        </View>
      </ScrollView>
    </Layout>
  );
};

const themedStyles = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-2",
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginBottom: 16,
  },
  headerTitle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  formCard: {
    margin: 16,
    borderRadius: 16,
    marginTop: 0,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 12,
    color: "text-primary-color",
  },
  input: {
    marginBottom: 12,
  },
  multilineText: {
    minHeight: 80,
  },
  divider: {
    marginVertical: 16,
  },
  ingredientsList: {
    marginBottom: 16,
  },
  ingredientCard: {
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "color-primary-500",
  },
  ingredientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ingredientInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  ingredientIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityBadge: {
    backgroundColor: "color-primary-100",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  quantityText: {
    color: "color-primary-700",
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    marginBottom: 16,
    fontStyle: "italic",
  },
  addIngredientCard: {
    backgroundColor: "background-basic-color-1",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "color-basic-400",
    borderRadius: 8,
  },
  addTitle: {
    marginBottom: 12,
    color: "text-hint-color",
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  selectIngredient: {
    flex: 3,
    marginRight: 8,
  },
  quantityInput: {
    flex: 1,
  },
  addButton: {
    alignSelf: "flex-end",
  },
  outputCard: {
    backgroundColor: "color-success-100",
    borderRadius: 8,
  },
  selectOutput: {
    flex: 3,
    marginRight: 8,
  },
  outputQuantityInput: {
    flex: 1,
  },
  outputPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "color-success-200",
    padding: 12,
    borderRadius: 8,
  },
  outputIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  outputText: {
    flex: 1,
    color: "color-success-800",
  },
  outputProductBadge: {
    backgroundColor: "color-success-300",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  outputProductText: {
    color: "color-success-900",
    fontWeight: "bold",
  },
  buttonContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 24,
  },
  deleteButton: {
    flex: 2,
    marginRight: 8,
    borderRadius: 8,
  },
  updateButton: {
    flex: 3,
    marginLeft: 8,
    borderRadius: 8,
  },
});

export default EditRecipeScreen;
