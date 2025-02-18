import React from "react";
import { Card, Modal, Spinner } from "@ui-kitten/components";

const WaitingModal = ({ waiting }): React.ReactElement => {
  return (
    <Modal
      visible={waiting}
      backdropStyle={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <Card>
        <Spinner />
      </Card>
    </Modal>
  );
};

export { WaitingModal };
