import React, { useState } from "react";
import { View, TouchableWithoutFeedback } from "react-native";

import {
  Card,
  Text,
  StyleService,
  Layout,
  Button,
  Input,
  Modal,
  Spinner,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useAccounts, useDatabases } from "../../hook/AppWrite";

interface CreatePropsCardProps {
  collection: string;
  method: "create" | "update" | "delete" | "cancel";
  onFinished: (success: boolean) => void;
  itemInfo: {
    $id?: string;
    name: string;
  };
}

const CreatePropsCard: React.FC<CreatePropsCardProps> = ({
  collection,
  method,
  onFinished,
  itemInfo,
}): React.ReactElement => {
  const styles = StyleService.create({
    item: {
      position: "absolute",
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
    },
    buttons: {
      display: "flex",
      flexDirection: "row",
      marginTop: 10,
      marginBottom: 10,
      marginRight: 10,
    },
  });

  const { t } = useTranslation();
  const { createItem, updateItem, deleteItem } = useDatabases();
  const [item, setItem] = useState(itemInfo);
  const [waiting, setWaiting] = useState(false);
  const { getUserPrefs } = useAccounts();
  const editItem = async (
    action: "create" | "update" | "delete" | "cancel"
  ) => {
    setWaiting(true);
    try {
      const userPrefs = await getUserPrefs();
      console.log("userPrefs in editItem:", userPrefs);
      switch (action) {
        case "create":
          await createItem(collection, { name: item.name });
          break;
        case "update":
          if (item.$id) {
            await updateItem(collection, item.$id, { name: item.name });
          }
          break;
        case "delete":
          if (item.$id) {
            await deleteItem(collection, item.$id);
          }
          break;
      }
      action === "cancel" ? onFinished(false) : onFinished(true);
    } catch (error) {
      console.error("Error in editItem:", error);
      onFinished(false);
    } finally {
      setWaiting(false);
    }
  };

  return (
    <Card style={styles.item}>
      <Modal
        visible={waiting}
        backdropStyle={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <Card>
          <Spinner />
        </Card>
      </Modal>
      <Input
        value={item.name}
        style={{ flex: 1, paddingRight: 10, width: "100%" }}
        autoFocus={true}
        onBlur={() => onFinished(false)}
        label={
          (method === "create" ? t("create") : t("edit")) +
          " " +
          t(collection).toLowerCase()
        }
        onChangeText={(nextValue) =>
          setItem((prev) => ({ ...prev, name: nextValue }))
        }
      />
      {method === "create" ? (
        <View style={styles.buttons}>
          <Button
            style={{ flex: 1, marginRight: 5 }}
            appearance="outline"
            onPress={() => editItem("cancel")}
          >
            {t("cancel")}
          </Button>
          <Button
            style={{ flex: 1, marginLeft: 5 }}
            onPress={() => editItem("create")}
          >
            {t("create")}
          </Button>
        </View>
      ) : (
        <View style={styles.buttons}>
          <Button
            style={{ flex: 1, marginRight: 5 }}
            appearance="outline"
            status="danger"
            onPress={() => editItem("delete")}
          >
            {t("delete") + " " + t(collection).toLowerCase()}
          </Button>
          <Button
            style={{ flex: 1, marginLeft: 5 }}
            onPress={() => editItem("update")}
          >
            {t("update")}
          </Button>
        </View>
      )}
    </Card>
  );
};

export { CreatePropsCard };
