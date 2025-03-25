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

interface OutputProduct {
  productId: string;
  name: string;
  quantity: number;
}

type RootStackParamList = {
  CreateRecipeScreen: undefined;
};

type CreateRecipeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, "CreateRecipeScreen">;
  route: RouteProp<RootStackParamList, "CreateRecipeScreen">;
};

const CreateRecipeScreen: React.FC<CreateRecipeScreenProps> = ({
  navigation,
  route,
}) => {
  const { t } = useTranslation();
  const { getAllItem, createItem } = useDatabases();
  const theme = useTheme();
  const styles = useStyleSheet(themedStyles);

  // State giữ nguyên
  const [recipeName, setRecipeName] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [outputProduct, setOutputProduct] = useState<Product | null>(null);
  const [outputQuantity, setOutputQuantity] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    loadWarehouseItems();
    loadProducts();
  }, []);

  // Giữ nguyên logic
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

  const saveRecipe = async () => {
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

    try {
      // Chuyển đổi danh sách nguyên liệu thành mảng chuỗi JSON
      const ingredientsArray = ingredients.map(
        (ingredient) =>
          `${ingredient.productId}:${ingredient.name}:${ingredient.quantity}`
      );
      const outputArray = [
        `${outputProduct.$id}:${outputProduct.name}:${parseInt(outputQuantity) || 1}`,
      ];

      await createItem(COLLECTION_IDS.recipes, {
        name: recipeName.trim(),
        description: description.trim(),
        ingredients: ingredientsArray, // Mảng chuỗi JSON
        output: outputArray, // Chuỗi JSON
      });

      Alert.alert(t("success"), t("recipe_created_successfully"));
      navigation.goBack();
    } catch (error) {
      console.error("Lỗi khi tạo công thức:", error);
      Alert.alert(t("error"), t("create_recipe_error"));
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
      setOutputProduct(allProducts[index.row]);
    }
  };

  return (
    <Layout style={styles.container as ViewStyle}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header với gradient */}
        <LinearGradient
          colors={["#2574FC", "#6A11CB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header as ViewStyle}
        >
          <Text category="h5" style={styles.headerTitle as TextStyle}>
            {t("create_recipe")}
          </Text>
          <Text appearance="hint" style={styles.headerSubtitle as TextStyle}>
            {t("create_recipe_description")}
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
              status="primary"
              accessoryLeft={(props) => (
                <Icon {...props} name="edit-2-outline" />
              )}
            />

            <Input
              label={t("description")}
              placeholder={t("enter_description")}
              value={description}
              onChangeText={setDescription}
              multiline
              textStyle={styles.multilineText as TextStyle}
              style={styles.input as TextStyle}
              accessoryLeft={(props) => (
                <Icon {...props} name="message-square-outline" />
              )}
            />
          </View>

          <Divider style={styles.divider as ViewStyle} />

          {/* Danh sách nguyên liệu */}
          <View style={styles.section as ViewStyle}>
            <Text category="s1" style={styles.sectionTitle as TextStyle}>
              <Icon
                name="layers-outline"
                fill={theme["color-primary-500"]}
                style={styles.titleIcon}
              />
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
              <View style={styles.emptyContainer as ViewStyle}>
                <Icon
                  name="alert-circle-outline"
                  fill={theme["color-basic-500"]}
                  style={styles.emptyIcon}
                />
                <Text appearance="hint" style={styles.emptyText as TextStyle}>
                  {t("add_some_ingredients")}
                </Text>
              </View>
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
              <Icon
                name="checkmark-circle-outline"
                fill={theme["color-success-500"]}
                style={styles.titleIcon}
              />
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
                  status="success"
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
                  status="success"
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
                    {t("recipe_will_produce")}
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

        {/* Nút lưu */}
        <Button
          style={styles.saveButton as ViewStyle}
          onPress={saveRecipe}
          accessoryLeft={
            isLoading
              ? (props) => <Spinner size="small" status="basic" />
              : (props) => <Icon {...props} name="save-outline" />
          }
          disabled={isLoading}
        >
          {isLoading ? t("saving") : t("save_recipe")}
        </Button>
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
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTitle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  headerSubtitle: {
    color: "white",
    opacity: 0.8,
    textAlign: "center",
  },
  formCard: {
    margin: 16,
    borderRadius: 16,
    marginTop: 24,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 16,
    color: "text-primary-color",
    flexDirection: "row",
    alignItems: "center",
  },
  titleIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  input: {
    marginBottom: 12,
    borderRadius: 8,
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
  emptyContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "color-basic-100",
    borderRadius: 8,
    marginBottom: 16,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    marginBottom: 8,
    opacity: 0.5,
  },
  emptyText: {
    textAlign: "center",
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
  saveButton: {
    margin: 16,
    marginTop: 8,
    borderRadius: 8,
  },
});

export default CreateRecipeScreen;
