import { StyleSheet, View, ViewStyle } from "react-native";

import React from "react";
import {
  Text,
  Button,
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";
const ReportScreen = ({ navigation }: { navigation: any }) => {
  const styles = useStyleSheet(styleSheet);
  return (
    <View style={styles.container as ViewStyle}>
      <View>
        <Text> REPORT SCREEN</Text>
        <Button onPress={() => navigation.navigate("ChatScreen")}>
          To Chat
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

export default ReportScreen;
