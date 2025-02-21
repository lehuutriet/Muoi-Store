import React, { useState } from "react";
import { ScrollView } from "react-native";
import { Button } from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useRecoilState } from "recoil";
import { allCategoryAtom } from "../../states";

const CategoryScrollbar = ({
  selectedCategory,
  setSelectedCategory,
}): React.ReactElement => {
  const { t } = useTranslation();
  const [categories, setCategories] = useRecoilState(allCategoryAtom);
  return (
    <ScrollView
      style={{ padding: 10, maxHeight: 60 }}
      contentContainerStyle={{ flexGrow: 1 }}
      horizontal={true}
      showsHorizontalScrollIndicator={false}
    >
      <Button
        style={{
          height: "100%",
          marginRight: 10,
        }}
        size="small"
        status={selectedCategory === "all" ? "primary" : "basic"}
        appearance="outline"
        onPress={() => setSelectedCategory("all")}
      >
        {t("all")}
      </Button>
      {categories.map((category) => (
        <Button
          key={category.$id}
          style={{
            height: "100%",
            marginRight: 10,
          }}
          size="small"
          status={selectedCategory === category.$id ? "primary" : "basic"}
          appearance="outline"
          onPress={() => setSelectedCategory(category.$id)}
        >
          {category.name}
        </Button>
      ))}
    </ScrollView>
  );
};

export { CategoryScrollbar };
