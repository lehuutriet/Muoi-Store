import React from "react";
import { Platform } from "react-native";
import AndroidDrawer from "./AndroidDrawer";
import IosDrawer from "./IosDrawer";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { StackScreenProps } from "@react-navigation/stack";
type RootStackParamList = {
  Main: {
    pushToken: string;
    onLoggedOut: () => void;
  };
};

type DrawerProps = {
  route: RouteProp<RootStackParamList, "Main">;
  navigation: StackNavigationProp<RootStackParamList, "Main">;
};

type ScreenProps = StackScreenProps<RootStackParamList, "Main">;
const Drawer = ({ route, navigation }: ScreenProps) => {
  const { pushToken, onLoggedOut } = route.params;

  // Tạo drawer component dựa trên platform
  const DrawerComponent = Platform.select({
    ios: () => <IosDrawer pushToken={pushToken} onLoggedOut={onLoggedOut} />,
    android: () => (
      <AndroidDrawer pushToken={pushToken} onLoggedOut={onLoggedOut} />
    ),
    default: () => (
      <AndroidDrawer pushToken={pushToken} onLoggedOut={onLoggedOut} />
    ),
  });

  return <DrawerComponent />;
};

export default Drawer;
