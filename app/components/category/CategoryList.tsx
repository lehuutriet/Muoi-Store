import React from "react";
import { ListRenderItemInfo, View, Dimensions } from "react-native";
import {
  Card,
  List,
  Text,
  useStyleSheet,
  useTheme,
  StyleService,
  Icon,
  CardProps,
} from "@ui-kitten/components";
import * as RootNavigation from "../../navigator/RootNavigation";

// Định nghĩa interface cho data item
interface ItemData {
  title: string;
  id: string;
  icon: string;
  screenName: string;
  method: string;
}

// Interface cho component props
interface CategoryListProps {
  data: ItemData[];
}

// Định nghĩa type cho footer props
interface FooterProps extends CardProps {
  style?: any;
}

const renderItemFooter = (
  footerProps: FooterProps,
  info: ListRenderItemInfo<ItemData>
): React.ReactElement => {
  const styles = useStyleSheet(styleSheet);
  return (
    <View {...footerProps} style={[footerProps.style]}>
      <Text category="s2" style={styles.footerText}>
        {info.item.title}
      </Text>
    </View>
  );
};

const CategoryList: React.FC<CategoryListProps> = ({ data }) => {
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();

  const renderItem = (
    info: ListRenderItemInfo<ItemData>
  ): React.ReactElement => (
    <Card
      style={styles.item}
      status="info"
      footer={(props) => renderItemFooter(props, info)}
      onPress={() => {
        RootNavigation.navigate(info.item.screenName, {
          method: info.item.method,
        });
      }}
    >
      <Icon
        style={styles.icon}
        name={info.item.icon}
        fill={theme["color-info-800"]}
      />
    </Card>
  );
};
const styleSheet = StyleService.create({
  container: {
    // maxHeight: 320,
    backgroundColor: "transparent",
  },
  contentContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    paddingBottom: 100,
  },
  item: {
    // marginVertical: 4,
    flex: 1,
    aspectRatio: 1.0,
    margin: 8,
    maxWidth: Dimensions.get("window").width / 3 - 16,
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
  },
  icon: {
    width: 24,
    height: 24,
  },
  footerText: {
    textAlign: "center",
    margin: 2,
  },
});

export { CategoryList };
