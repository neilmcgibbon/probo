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
  Breadcrumb,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DropdownItem,
  Field,
  IconPencil,
  IconTrashCan,
  useConfirm,
  useDialogRef,
} from "@probo/ui";
import { useForm } from "react-hook-form";
import { graphql, useMutation } from "react-relay";

import type { ProcessActionsDeleteMutation } from "#/__generated__/core/ProcessActionsDeleteMutation.graphql";
import type { ProcessActionsUpdateMutation } from "#/__generated__/core/ProcessActionsUpdateMutation.graphql";

const updateProcessMutation = graphql`
  mutation ProcessActionsUpdateMutation($input: UpdateRiskAssessmentProcessInput!) {
    updateRiskAssessmentProcess(input: $input) {
      riskAssessmentProcess { id sourceNodeId targetNodeId name description }
    }
  }
`;

const deleteProcessMutation = graphql`
  mutation ProcessActionsDeleteMutation(
    $input: DeleteRiskAssessmentProcessInput!
    $connections: [ID!]!
  ) {
    deleteRiskAssessmentProcess(input: $input) {
      deletedRiskAssessmentProcessId @deleteEdge(connections: $connections)
    }
  }
`;

export function ProcessActions(props: {
  process: { id: string; name: string };
  connectionId: string;
}) {
  const { __ } = useTranslate();
  const confirm = useConfirm();
  const dialogRef = useDialogRef();
  const [updateProcess] = useMutation<ProcessActionsUpdateMutation>(updateProcessMutation);
  const [deleteProcess] = useMutation<ProcessActionsDeleteMutation>(deleteProcessMutation);
  const { register, handleSubmit } = useForm({
    values: { name: props.process.name },
  });
  return (
    <>
      <ActionDropdown>
        <DropdownItem icon={IconPencil} onSelect={() => dialogRef.current?.open()}>
          {__("Edit")}
        </DropdownItem>
        <DropdownItem
          icon={IconTrashCan}
          variant="danger"
          onSelect={() => confirm(
            () => {
              deleteProcess({
                variables: {
                  input: { riskAssessmentProcessId: props.process.id },
                  connections: [props.connectionId],
                },
              });
            },
            { message: __("Delete this process?") },
          )}
        >
          {__("Delete")}
        </DropdownItem>
      </ActionDropdown>
      <Dialog className="max-w-lg" ref={dialogRef} title={<Breadcrumb items={[__("Processes"), __("Edit")]} />}>
        <form onSubmit={e => void handleSubmit((d) => {
          updateProcess({
            variables: { input: { id: props.process.id, name: d.name } },
            onCompleted: () => { dialogRef.current?.close(); },
          });
        })(e)}
        >
          <DialogContent padded className="space-y-4">
            <Field label={__("Name")} {...register("name", { required: __("This field is required") })} type="text" />
          </DialogContent>
          <DialogFooter><Button type="submit">{__("Save")}</Button></DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
