import { StyleSheet, View, ViewStyle } from "react-native";

import React from "react";
import {
  Text,
  Button,
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";

const WarehouseScreen = ({ navigation }: { navigation: any }) => {
  const styles = useStyleSheet(styleSheet);
  return (
    <View style={styles.container as ViewStyle}>
      <View>
        <Text> WAREHOUSE SCREEN</Text>
        <Button onPress={() => navigation.navigate("ReportScreen")}>
          To Report
        </Button>
      </View>
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
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: "45%",
    margin: 10,
  },
});

export default WarehouseScreen;
