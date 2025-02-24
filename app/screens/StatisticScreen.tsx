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
import { ViewStyle } from "react-native";
const StatisticScreen = () => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  return (
    <Layout style={styles.mainLayout as ViewStyle}>
      <Text>{`${t("statistic")}`}</Text>
      {/* <Text category="h1">{`${t("setting")}`}</Text> */}
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
    </Layout>
  );
};

const styleSheet = StyleService.create({
  mainLayout: {
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

export default StatisticScreen;
