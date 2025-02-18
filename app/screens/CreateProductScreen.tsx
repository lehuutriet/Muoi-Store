import React, { useEffect, useState, useCallback } from "react";
import { View, Image, Dimensions, Alert } from "react-native";

import {
  Text,
  Button,
  StyleService,
  useStyleSheet,
  Layout,
  Input,
  Icon,
  useTheme,
  Select,
  SelectItem,
  IndexPath,
  Modal,
  Card,
  Spinner,
} from "@ui-kitten/components";
import { WaitingModal } from "../components/common";
import { createNumberMask, useMaskedInputProps } from "react-native-mask-input";

import { productIdsAtom, productAtomFamily, allCategoryAtom } from "../states";
import { useRecoilState, useRecoilCallback } from "recoil";

import { useStorage, useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { useTranslation } from "react-i18next";

import * as ImagePicker from "expo-image-picker";
type ImagePickerResult = ImagePicker.ImagePickerResult & {
  cancelled?: boolean;
};

const vndMask = createNumberMask({
  // prefix: ['đ'],
  delimiter: ",",
  separator: ",",
  precision: 3,
});

const requiredText = (): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Text style={{ fontSize: 12 }} status="danger">
      {t("required")}
    </Text>
  );
};

const CreateProductScreen = ({ route, navigation }) => {
  const { uploadFile, getFileView } = useStorage();
  const { getAllItem, createItem, updateItem, deleteItem } = useDatabases();
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const [required, setRequired] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [photo, setPhoto] = useState({
    uri: "file:///data/user/0/host.exp.exponent/cache/ExperienceData/%2540kennytat%252Fmuoi-store/ReactNative-snapshot-image8725451301359036851.png",
  });

  const [categories] = useRecoilState(allCategoryAtom);
  const [photoID, setPhotoID] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(null);
  const [cost, setCost] = useState(null);
  const [selectedCategoryIndex, setSelectedCategoryIndex] =
    React.useState<IndexPath>(new IndexPath(0));

  useEffect(() => {
    console.log("CreateProductScreen called::", route.params);
    navigation.setOptions({ headerTitle: route.params.title });
    const item = route.params.item;
    if (item && item.$id) {
      if (item.photo) {
        setPhotoID(item.photo);
      }
      if (item.photoUrl) {
        setPhoto({ uri: item.photoUrl });
      }
      if (item.name) {
        setName(item.name);
      }
      if (item.price) {
        setPrice(item.price.toString());
      }
      if (item.cost) {
        setCost(item.cost.toString());
      }
      if (item.description) {
        setDescription(item.description);
      }
      if (item.category) {
        let index = categories.findIndex(
          (category) => category.$id === item.category
        );
        index = index >= 0 ? index + 1 : 0;
        setSelectedCategoryIndex(new IndexPath(index));
      }
    }
  }, []);

  const handleTakePhotoFromCamera = async () => {
    // No permissions request is necessary for launching the image library
    let result: ImagePickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      selectionLimit: 1,
    });
    delete result.cancelled;
    console.log("photo::", JSON.stringify(result));
    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const handleChoosePhotoFromLibrary = async () => {
    // No permissions request is necessary for launching the image library
    let result: ImagePickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      selectionLimit: 1,
    });
    delete result.cancelled;
    console.log("photo::", JSON.stringify(result));
    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const showAlert = (tilte, message) =>
    Alert.alert(
      tilte,
      message,
      [
        {
          text: "Ok",
          // onPress: () => Alert.alert('Cancel Pressed'),
          style: "cancel",
        },
      ],
      {
        cancelable: true,
        // onDismiss: () =>
        //   Alert.alert(
        //     'This alert was dismissed by tapping outside of the alert dialog.',
        //   ),
      }
    );

  // Refresh Product List
  const refreshProductList = useRecoilCallback(
    ({ set }) =>
      async () => {
        const productData = await getAllItem(COLLECTION_IDS.products);
        const ids = [];
        for (const product of productData) {
          ids.push(product.$id);
          set(productAtomFamily(product.$id), product);
        }
        set(productIdsAtom, ids);
      },
    []
  );

  const onReset = async () => {
    setRequired(false);
    setPhotoID(null);
    setPhoto({ uri: "file:///default.jpeg" });
    setName("");
    setPrice(null);
    setCost(null);
    setDescription("");
    setSelectedCategoryIndex(new IndexPath(0));
  };

  const onDelete = async () => {
    if (route.params.item && route.params.item.$id) {
      try {
        await deleteItem(COLLECTION_IDS.products, route.params.item.$id);
        showAlert("", t("delete_product_success"));
      } catch (error) {
        showAlert("", t("delete_product_error"));
        console.log("deleteItem error::", error);
      } finally {
        refreshProductList();
        navigation.goBack();
      }
    }
  };

  const onCreate = async (method: string, navigateBack: boolean = true) => {
    setWaiting(true);
    let data = {
      name: name,
      price: price,
      cost: parseInt(cost.replace(/\D/g, "")),
      category:
        categories.length > 0 && selectedCategoryIndex.row > 0
          ? categories[selectedCategoryIndex.row - 1].$id
          : null,
      description: description,
      photo: photoID,
    };

    console.log("new object::", method, data);
    if (!data.name || !data.price || !data.category) {
      console.log("new object missing::", data);
      setRequired(true);
    } else {
      // console.log("photo upload::", photoUri);
      if (
        !photo.uri.startsWith("http") &&
        photo.uri !== "file:///default.jpeg"
      ) {
        const newPhotoID: any = await uploadFile(photo, photoID);
        data.photo = newPhotoID ? newPhotoID : photoID;
      }
      const result =
        method === "create"
          ? await createItem(COLLECTION_IDS.products, data)
          : method === "update"
          ? await updateItem(
              COLLECTION_IDS.products,
              route.params.item.$id,
              data
            )
          : null;
      console.log("created Product::", result);
      if (result && result.$id) {
        showAlert(
          "",
          method === "create"
            ? t("create_product_success")
            : t("update_product_success")
        );
        onReset();
      } else {
        showAlert(
          "",
          method === "create"
            ? t("create_product_error")
            : t("update_product_error")
        );
      }
      refreshProductList();
      navigateBack ? navigation.goBack() : null;
    }
    setWaiting(false);
  };

  //
  return (
    <Layout level="1" style={{ height: Dimensions.get("window").height - 50 }}>
      {/* upload photo */}
      <Layout level="2" style={[styles.photoLayout, {}]}>
        <View>
          <Button
            style={[styles.button, { marginBottom: 5 }]}
            status="primary"
            appearance="outline"
            size="small"
            accessoryLeft={() => (
              <Icon
                style={styles.icon}
                fill={theme["color-primary-500"]}
                name="image"
              />
            )}
            onPress={handleChoosePhotoFromLibrary}
          >
            {t("upload_photo")}
          </Button>

          <Button
            style={styles.button}
            status="primary"
            appearance="outline"
            size="small"
            accessoryLeft={() => (
              <Icon
                style={styles.icon}
                fill={theme["color-primary-500"]}
                name="camera"
              />
            )}
            onPress={handleTakePhotoFromCamera}
          >
            {t("camera")}
          </Button>
        </View>
        <View style={{ paddingLeft: 10 }}>
          {photo && <Image source={{ uri: photo.uri }} style={styles.photo} />}
        </View>
      </Layout>

      <Layout level="1" style={styles.productInfo}>
        {/* product name */}
        <Input
          style={styles.input}
          value={name}
          label={t("product_name")}
          placeholder={t("product_example")}
          caption={() => (required && !name ? requiredText() : <></>)}
          // accessoryRight={renderIcon}
          // secureTextEntry={secureTextEntry}
          onChangeText={(nextValue) => setName(nextValue)}
        />
        {/* product description */}
        <Input
          style={styles.input}
          value={description}
          label={t("product_description")}
          placeholder=""
          // caption={() => (required && !description ? requiredText() : <></>)}
          // accessoryRight={renderIcon}
          // secureTextEntry={secureTextEntry}
          onChangeText={(nextValue) => setDescription(nextValue)}
        />
        <Layout level="1" style={styles.price}>
          {/* product price */}
          <Input
            {...useMaskedInputProps({
              value: price,
              onChangeText: (masked, unmasked) => setPrice(unmasked),
              mask: vndMask,
            })}
            style={[
              styles.input,
              {
                paddingRight: 10,
                width: Dimensions.get("screen").width / 2 - 10,
              },
            ]}
            inputMode="numeric"
            label={t("price")}
            placeholder="0.000"
            caption={() => (required && !price ? requiredText() : <></>)}
            // accessoryRight={renderIcon}
            // secureTextEntry={secureTextEntry}
          />
          {/* product cost */}
          <Input
            {...useMaskedInputProps({
              value: cost,
              onChangeText: (masked, unmasked) => setCost(unmasked),
              mask: vndMask,
            })}
            style={[
              styles.input,
              { width: Dimensions.get("screen").width / 2 - 10 },
            ]}
            inputMode="numeric"
            label={t("cost")}
            placeholder="0.000"
            // caption={() => (required && !cost ? requiredText() : <></>)}
            // accessoryRight={renderIcon}
            // secureTextEntry={secureTextEntry}
            onChangeText={(nextValue) => setCost(nextValue)}
          />
        </Layout>
        {/* product categories */}
        <View>
          <Text style={{ color: theme["color-basic-600"], fontWeight: "bold" }}>
            {t("category")}
          </Text>
          <Select
            placeholder={t("no_category")}
            value={
              categories.length > 0
                ? selectedCategoryIndex.row > 0
                  ? categories[selectedCategoryIndex.row - 1].name
                  : t("choose_category")
                : null
            }
            selectedIndex={selectedCategoryIndex}
            onSelect={(index: IndexPath) => setSelectedCategoryIndex(index)}
          >
            {categories.length > 0 ? (
              [{ name: t("choose_category"), $id: "0" }]
                .concat(categories)
                .map((category) => (
                  <SelectItem title={category.name} key={category.$id} />
                ))
            ) : (
              <></>
            )}
          </Select>
        </View>
      </Layout>
      {/* function button */}
      {route.params.method === "create" ? (
        <Layout level="1" style={styles.buttons}>
          <Button
            style={{ flex: 1, marginRight: 5, borderWidth: 0 }}
            appearance="outline"
            status="primary"
            onPress={() => onCreate("create", false)}
          >
            {t("create_more")}
          </Button>
          <Button
            style={{ flex: 1, marginLeft: 5 }}
            onPress={() => onCreate("create")}
          >
            {t("done")}
          </Button>
        </Layout>
      ) : (
        <Layout level="1" style={styles.buttons}>
          <Button
            style={{ flex: 1, marginRight: 5, borderWidth: 0 }}
            appearance="outline"
            status="danger"
            onPress={() => onDelete()}
          >
            {t("delete")}
          </Button>
          <Button
            style={{ flex: 1, marginLeft: 5 }}
            onPress={() => onCreate("update")}
          >
            {t("update")}
          </Button>
        </Layout>
      )}
      <WaitingModal waiting={waiting} />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  photoLayout: {
    justifyContent: "flex-start",
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    padding: 10,
    // paddingHorizontal: 20,
  },
  button: {
    backgroundColor: "white",
  },
  detail: {
    flexDirection: "row",
    display: "flex",
    width: Dimensions.get("window").width - 100,
  },
  productInfo: {
    width: "100%",
    flex: 1,
    // height: Dimensions.get("window").height,
    padding: 10,
  },
  price: {
    flexDirection: "row",
    display: "flex",
    width: "100%",
    // width: 50,
    // backgroundColor: "red",
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 5,
  },
  icon: {
    width: 20,
    height: 20,
  },
  input: {
    paddingBottom: 10,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "white",
    borderRadius: 0,
  },

  buttons: {
    display: "flex",
    flexDirection: "row",
    position: "absolute",
    bottom: 30,
    padding: 10,
  },
});

export default CreateProductScreen;
