import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from "react-native";
import { Text, Icon, IconElement } from "@ui-kitten/components";

// Định nghĩa interfaces
export interface MenuItemProps {
  title: string;
  icon?: (props: any) => IconElement;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessoryLeft?: (props: any) => IconElement;
  accessoryRight?: (props: any) => IconElement;
}
export interface MenuGroupsProps {
  onNavigate: (screenName: string, method: string) => void;
}
export interface MenuProps {
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  data: MenuItemProps[];
  style?: StyleProp<ViewStyle>;
}

const MenuItem: React.FC<MenuItemProps> = ({
  title,
  icon,
  onPress,
  style,
  accessoryLeft,
  accessoryRight,
}) => {
  return (
    <TouchableOpacity style={[styles.menuItem, style]} onPress={onPress}>
      <View style={styles.menuItemContent}>
        {accessoryLeft && (
          <View style={styles.accessoryLeft}>
            {accessoryLeft({
              style: styles.icon,
            })}
          </View>
        )}

        <Text style={styles.menuItemTitle}>{title}</Text>

        {accessoryRight && (
          <View style={styles.accessoryRight}>
            {accessoryRight({
              style: styles.icon,
            })}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const Menu: React.FC<MenuProps> = ({
  selectedIndex,
  onSelect,
  data,
  style,
}) => {
  const handleSelect = (index: number) => {
    if (onSelect) {
      onSelect(index);
    }
  };

  return (
    <ScrollView
      style={[styles.container, style]}
      showsVerticalScrollIndicator={false}
    >
      {data.map((item, index) => (
        <MenuItem
          key={index}
          {...item}
          onPress={() => handleSelect(index)}
          style={[item.style, selectedIndex === index && styles.selectedItem]}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemTitle: {
    flex: 1,
    fontSize: 16,
  },
  selectedItem: {
    backgroundColor: "#F7F9FC",
  },
  icon: {
    width: 24,
    height: 24,
  },
  accessoryLeft: {
    marginRight: 12,
  },
  accessoryRight: {
    marginLeft: 12,
  },
});
export default MenuItem;
