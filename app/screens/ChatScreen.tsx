import { StyleSheet, View, ViewStyle } from "react-native";
import React from "react";
import {
  Text,
  Button,
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";

// Thêm interface cho navigation props
interface NavigationProps {
  navigate: (screen: string) => void;
}

interface ChatScreenProps {
  navigation: NavigationProps;
}

const ChatScreen = ({ navigation }: ChatScreenProps) => {
  const styles = useStyleSheet(styleSheet);
  return (
    <View style={styles.container as ViewStyle}>
      <View>
        <Text> CHAT SCREEN</Text>
        <Button onPress={() => navigation.navigate("WarehouseScreen")}>
          To Warehouse
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

export default ChatScreen;
