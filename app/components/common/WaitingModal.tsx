import React from "react";
import { View, StyleSheet } from "react-native";
import { Modal, Card, Text, Spinner } from "@ui-kitten/components";
import { useTranslation } from "react-i18next";

interface WaitingModalProps {
  waiting: boolean;
}

export const WaitingModal: React.FC<WaitingModalProps> = ({ waiting }) => {
  const { t } = useTranslation();

  return (
    <Modal visible={waiting} backdropStyle={styles.backdrop}>
      <Card style={styles.card} disabled={true}>
        <View style={styles.container}>
          <Spinner size="large" />
          <Text style={styles.text}>{t("please_wait")}</Text>
        </View>
      </Card>
      -
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  card: {
    padding: 20,
    borderRadius: 8,
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    marginTop: 16,
  },
});

export default WaitingModal;
