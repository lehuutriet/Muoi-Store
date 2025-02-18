import React, { useState } from "react";
import { ScrollView } from "react-native";
import { Button } from "@ui-kitten/components";
import { useTranslation } from "react-i18next";

const OrderScrollbar = ({
  selectedFilter,
  setSelectedFilter,
}): React.ReactElement => {
  const { t } = useTranslation();
  const filterButtonData = [
    {
      name: t("all"),
      type: "all",
    },
    {
      name: t("unpaid"),
      type: "unpaid",
    },
    {
      name: t("paid"),
      type: "paid",
    },
  ];

  return (
    <ScrollView
      style={{ padding: 10, maxHeight: 60 }}
      contentContainerStyle={{ flexGrow: 1 }}
      horizontal={true}
      showsHorizontalScrollIndicator={false}
    >
      {filterButtonData.map((item) => (
        <Button
          key={item.type}
          style={{
            height: "100%",
            marginRight: 10,
          }}
          size="small"
          status={selectedFilter === item.type ? "primary" : "basic"}
          appearance="outline"
          onPress={() => setSelectedFilter(item.type)}
        >
          {item.name}
        </Button>
      ))}
    </ScrollView>
  );
};

export { OrderScrollbar };
