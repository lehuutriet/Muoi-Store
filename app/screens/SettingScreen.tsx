import React from "react";
import { useTranslation } from "react-i18next";
import {
  Layout,
  Text,
  Button,
  Icon,
  IconElement,
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";
import * as RootNavigation from "../navigator/RootNavigation";
// import { Alert, Modal, Pressable, View } from "react-native";

const SettingScreen = () => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  return (
    <Layout style={styles.settingLayout}>
      {/* <Layout style={styles.settingContent}>
        <Button
          style={styles.settingIcon}
          appearance="outline"
          accessoryLeft={(props): IconElement => (
            <Icon
              {...props}
              name={theme.theme === "light" ? "moon" : "moon-outline"}
            />
          )}
          onPress={() => theme.toggleTheme()}
        ></Button>
        <Text>
          {theme.theme === "light" ? `${t("dark_mode")}` : `${t("light_mode")}`}
        </Text>
      </Layout> */}
      <Layout style={styles.settingContent}>
        <Button
          style={styles.settingIcon}
          appearance="outline"
          accessoryLeft={(props): IconElement => (
            <Icon {...props} name={"printer"} />
          )}
          onPress={() => RootNavigation.navigate("PrinterScreen")}
        >
          <Text>{`${t("connect_ble_printer")}`}</Text>
        </Button>
      </Layout>
      <Layout style={styles.settingContent}>
        <Button
          style={styles.settingIcon}
          appearance="outline"
          accessoryLeft={(props): IconElement => (
            <Icon {...props} name={"shield"} />
          )}
          onPress={() => RootNavigation.navigate("PasswordScreen")}
        >
          <Text>{`${t("password_change")}`}</Text>
        </Button>
      </Layout>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  settingLayout: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  settingContent: {
    // flex: 1,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  settingIcon: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
});

export default SettingScreen;
