import React from "react";
import {
  Icon,
  IconElement,
  Layout,
  Menu,
  MenuGroup,
  MenuItem,
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";

const MenuGroups = ({ onNavigate }): React.ReactElement => {
  const { t } = useTranslation();
  const styles = useStyleSheet(styleSheet);
  const [selectedIndex, setSelectedIndex] = React.useState(null);

  return (
    <Menu
      style={styles.menu}
      selectedIndex={selectedIndex}
      onSelect={(index) => setSelectedIndex(index)}
    >
      <MenuItem
        title={t("create_order")}
        accessoryLeft={(props) => <Icon {...props} name="calendar-outline" />}
        style={styles.menuItem}
        onPress={() => onNavigate("CreateOrderScreen", "create")}
      />
      <MenuItem
        title={t("manage_order")}
        accessoryLeft={(props) => (
          <Icon {...props} name="checkmark-square-outline" />
        )}
        style={styles.menuItem}
        onPress={() => onNavigate("ManageOrderScreen", "manage")}
      />
      {/* <MenuItem
        title={t("create_product")}
        accessoryLeft={(props) => <Icon {...props} name="file-add-outline" />}
        style={styles.menuItem}
        onPress={() => onNavigate("CreateProductScreen")}
      /> */}
      <MenuItem
        title={t("manage_product")}
        accessoryLeft={(props) => <Icon {...props} name="layout-outline" />}
        style={styles.menuItem}
        onPress={() => onNavigate("ManageProductScreen", "manage")}
      />
      <MenuItem
        title={t("manage_table")}
        accessoryLeft={(props) => <Icon {...props} name="monitor-outline" />}
        style={styles.menuItem}
        onPress={() => onNavigate("ManageTableScreen", "manage")}
      />
      {/* 
      <MenuGroup title="Akveo React Native" accessoryLeft={SmartphoneIcon}>
        <MenuItem title="UI Kitten" accessoryLeft={StarIcon} />
        <MenuItem title="Kitten Tricks" accessoryLeft={StarIcon} />
      </MenuGroup>

      <MenuGroup title="Akveo Angular" accessoryLeft={BrowserIcon}>
        <MenuItem title="Nebular" accessoryLeft={StarIcon} />
        <MenuItem title="ngx-admin" accessoryLeft={StarIcon} />
        <MenuItem title="UI Bakery" accessoryLeft={StarIcon} />
      </MenuGroup>

      <MenuGroup title="Akveo Design" accessoryLeft={ColorPaletteIcon}>
        <MenuItem title="Eva Design System" accessoryLeft={StarIcon} />
        <MenuItem title="Eva Icons" accessoryLeft={StarIcon} />
      </MenuGroup> */}
    </Menu>
  );
};

const styleSheet = StyleService.create({
  menu: {
    width: "100%",
    // backgroundColor: "color-basic-100",
  },
  menuItem: {
    backgroundColor: "color-basic-200",
  },
});

export default MenuGroups;
