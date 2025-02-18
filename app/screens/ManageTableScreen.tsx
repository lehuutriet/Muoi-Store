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

const DEFAULT_CARD_PROPS = {
  visible: false,
  method: "create",
  itemInfo: {
    $id: "",
    name: "",
  },
};

const FunctionCard = ({
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
        const tableData = await getAllItem(COLLECTION_IDS.tables);
        set(allTablesAtom, tableData);
        const ids = [];
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

const TableCard = ({ tableId, setCardPropsCallback }): React.ReactElement => {
  const [table, setTable] = useRecoilState(tableAtomFamily(tableId));
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const renderItemFooter = (footerProps, item): React.ReactElement => {
    const styles = useStyleSheet(styleSheet);
    return (
      <View {...footerProps} style={[footerProps.style]}>
        <Text category="s2" style={styles.footerText}>
          {item.name}
        </Text>
      </View>
    );
  };
  return (
    <Card
      style={styles.item}
      status="info"
      // header={(headerProps) => renderItemHeader(headerProps, info)}
      footer={(footerProps) => renderItemFooter(footerProps, table)}
      onPress={() =>
        setCardPropsCallback({ method: "edit", visible: true, itemInfo: table })
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

const ManageTableScreen = ({ navigation }) => {
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAllItem } = useDatabases();
  const [cardProps, setCardProps] = useState(DEFAULT_CARD_PROPS);
  // const [tables, setTables] = useRecoilState(allTablesAtom);
  const tableIds = useRecoilValue(tableIdsAtom);

  const setCardPropsCallback = useCallback((props) => {
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
      <ScrollView contentContainerStyle={styles.container}>
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
