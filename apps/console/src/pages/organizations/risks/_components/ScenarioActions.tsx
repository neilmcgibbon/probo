// Copyright (c) 2026 Probo Inc <hello@getprobo.com>.
//
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
// REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
// AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
// INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
// LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
// OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
// PERFORMANCE OF THIS SOFTWARE.

import { useTranslate } from "@probo/i18n";
import {
  ActionDropdown,
  DropdownItem,
  IconTrashCan,
  useConfirm,
} from "@probo/ui";
import { graphql, useMutation } from "react-relay";

import type { ScenarioActionsDeleteMutation } from "#/__generated__/core/ScenarioActionsDeleteMutation.graphql";

const deleteMutation = graphql`
  mutation ScenarioActionsDeleteMutation(
    $input: DeleteRiskScenarioInput!
    $connections: [ID!]!
  ) {
    deleteRiskScenario(input: $input) {
      deletedRiskScenarioId @deleteEdge(connections: $connections)
    }
  }
`;

export function ScenarioActions(props: {
  scenarioId: string;
  connectionId: string;
}) {
  const { __ } = useTranslate();
  const confirm = useConfirm();
  const [deleteScenario] = useMutation<ScenarioActionsDeleteMutation>(
    deleteMutation,
  );

  const handleDelete = () => {
    confirm(
      () => {
        deleteScenario({
          variables: {
            input: { riskScenarioId: props.scenarioId },
            connections: [props.connectionId],
          },
        });
      },
      {
        message: __("Remove this scenario from the risk?"),
      },
    );
  };

  return (
    <ActionDropdown>
      <DropdownItem
        icon={IconTrashCan}
        variant="danger"
        onSelect={handleDelete}
      >
        {__("Remove")}
      </DropdownItem>
    </ActionDropdown>
  );
}
