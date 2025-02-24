import React, { useEffect, useState, useCallback, memo } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Dimensions,
  ScrollView,
  ListRenderItemInfo,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  Text,
  Button,
  StyleService,
  useStyleSheet,
  TabBar,
  Tab,
  Layout,
  List,
  ListItem,
  Icon,
  Modal,
  Card,
  useTheme,
} from "@ui-kitten/components";
import { FloatingAction } from "react-native-floating-action";
import { CreatePropsCard } from "../components/common";
// import * as RootNavigation from "../navigator/RootNavigation";
import { useRecoilState, useRecoilValue, useRecoilCallback } from "recoil";
import { allTablesAtom, tableAtomFamily, tableIdsAtom } from "../states";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { ViewStyle, TextStyle } from "react-native";

interface CardProps {
  visible: boolean;
  method: "create" | "update" | "delete" | "cancel";
  itemInfo: {
    $id?: string;
    name: string;
  };
}

interface FunctionCardProps {
  cardProps: CardProps;
  setCardPropsCallback: (props: CardProps) => void;
}

interface TableCardProps {
  tableId: string;
  setCardPropsCallback: (props: CardProps) => void;
}

interface Table {
  $id: string;
  name: string;
}
const DEFAULT_CARD_PROPS: CardProps = {
  visible: false,
  method: "create", // Thay vì "create" string thường
  itemInfo: {
    $id: "",
    name: "",
  },
};
interface TableCardProps {
  tableId: string;
  setCardPropsCallback: (props: CardProps) => void;
}

const FunctionCard: React.FC<FunctionCardProps> = ({
  cardProps,
  setCardPropsCallback,
}): React.ReactElement => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { getAllItem } = useDatabases();

  const tableScreenActions = [
    {
      text: t("create_table"),
      icon: require("../../assets/icons/plus-outline.png"),
      name: "CreateTableScreen",
      position: 1,
    },
  ];

  const refreshTables = useRecoilCallback(
    ({ set }) =>
      async () => {
        setCardPropsCallback(DEFAULT_CARD_PROPS);
        const tableData: Table[] = await getAllItem(COLLECTION_IDS.tables);
        set(allTablesAtom, tableData);
        const ids: string[] = [];
        for (const table of tableData) {
          ids.push(table.$id);
          set(tableAtomFamily(table.$id), table);
        }
        set(tableIdsAtom, ids);
      },
    []
  );
  return cardProps.visible ? (
    <CreatePropsCard
      collection={COLLECTION_IDS.tables}
      method={cardProps.method}
      onFinished={() => refreshTables()}
      itemInfo={cardProps.itemInfo}
    />
  ) : (
    <FloatingAction
      actions={tableScreenActions}
      onPressMain={() => console.log("floating button pressed::")}
      overrideWithAction={true}
      showBackground={false}
      onPressItem={(screenName) => {
        console.log(`selected button:: ${screenName}`);
        setCardPropsCallback({
          method: DEFAULT_CARD_PROPS.method,
          visible: true,
          itemInfo: DEFAULT_CARD_PROPS.itemInfo,
        });
        // RootNavigation.navigate(screenName);
      }}
    />
  );
};

const TableCard = ({
  tableId,
  setCardPropsCallback,
}: TableCardProps): React.ReactElement => {
  const [table] = useRecoilState(tableAtomFamily(tableId));

  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const renderItemFooter = (
    footerProps: any,
    item: Table
  ): React.ReactElement => {
    const styles = useStyleSheet(styleSheet);
    return (
      <View {...footerProps} style={[footerProps.style]}>
        <Text category="s2" style={styles.footerText as TextStyle}>
          {item.name}
        </Text>
      </View>
    );
  };
  return (
    <Card
      style={styles.item as ViewStyle}
      status="info"
      // header={(headerProps) => renderItemHeader(headerProps, info)}
      footer={(footerProps) => renderItemFooter(footerProps, table)}
      onPress={() =>
        setCardPropsCallback({
          method: "update",
          visible: true,
          itemInfo: table,
        })
      }
    >
      <Icon
        style={styles.icon}
        name="monitor-outline"
        fill={theme["color-info-800"]}
      ></Icon>
    </Card>
  );
};

const MemoizedTableCard = memo(
  TableCard,
  (prev, next) => prev.tableId === next.tableId
);

const ManageTableScreen = ({}) => {
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAllItem } = useDatabases();
  const [cardProps, setCardProps] = useState(DEFAULT_CARD_PROPS);
  // const [tables, setTables] = useRecoilState(allTablesAtom);
  const tableIds = useRecoilValue(tableIdsAtom);

  const setCardPropsCallback = useCallback((props: CardProps) => {
    setCardProps((prev) => ({
      method: props.method,
      visible: props.visible,
      itemInfo: props.itemInfo,
    }));
  }, []);
  return (
    <Layout
      style={{
        flex: 1,
      }}
    >
      <ScrollView contentContainerStyle={styles.container as ViewStyle}>
        {tableIds.map((id) => (
          <MemoizedTableCard
            key={id}
            tableId={id}
            setCardPropsCallback={setCardPropsCallback}
          />
        ))}
        <Layout style={{ paddingBottom: 100 }}></Layout>
      </ScrollView>
      <FunctionCard
        cardProps={cardProps}
        setCardPropsCallback={setCardPropsCallback}
      />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  list: {},
  listContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    paddingBottom: 100,
  },
  item: {
    // marginVertical: 4,
    // flex: 1,
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

export default ManageTableScreen;
