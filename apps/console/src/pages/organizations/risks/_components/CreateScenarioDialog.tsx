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
  Breadcrumb,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Field,
  IconPlusLarge,
  useDialogRef,
} from "@probo/ui";
import { useForm } from "react-hook-form";
import { graphql, useMutation } from "react-relay";

import type { CreateScenarioDialogMutation } from "#/__generated__/core/CreateScenarioDialogMutation.graphql";

const createMutation = graphql`
  mutation CreateScenarioDialogMutation(
    $input: CreateRiskScenarioInput!
    $connections: [ID!]!
  ) {
    createRiskScenario(input: $input) {
      riskScenarioEdge @appendEdge(connections: $connections) {
        node { id name description }
      }
    }
  }
`;

export function CreateScenarioDialog(props: {
  riskId: string;
  connectionId: string;
}) {
  const { __ } = useTranslate();
  const dialogRef = useDialogRef();
  const [createScenario, isCreating] = useMutation<CreateScenarioDialogMutation>(
    createMutation,
  );
  const { register, handleSubmit, reset, formState } = useForm({
    defaultValues: { name: "", description: "", threatId: "" },
  });

  const onSubmit = (data: {
    name: string;
    description: string;
    threatId: string;
  }) => {
    createScenario({
      variables: {
        input: {
          riskId: props.riskId,
          threatId: data.threatId,
          name: data.name,
          description: data.description || null,
        },
        connections: [props.connectionId],
      },
      onCompleted: () => {
        reset();
        dialogRef.current?.close();
      },
    });
  };

  return (
    <Dialog
      className="max-w-lg"
      ref={dialogRef}
      trigger={(
        <Button icon={IconPlusLarge} variant="secondary">
          {__("Link Scenario")}
        </Button>
      )}
      title={(
        <Breadcrumb items={[__("Scenarios"), __("Link Scenario")]} />
      )}
    >
      <form onSubmit={e => void handleSubmit(onSubmit)(e)}>
        <DialogContent padded className="space-y-4">
          <Field
            label={__("Threat ID")}
            {...register("threatId", { required: __("This field is required") })}
            type="text"
            error={formState.errors.threatId?.message}
            placeholder={__("Paste the threat ID from a risk assessment scope")}
          />
          <Field
            label={__("Name")}
            {...register("name", { required: __("This field is required") })}
            type="text"
            error={formState.errors.name?.message}
            placeholder={__("e.g. SQL injection impacts data breach")}
          />
          <Field
            label={__("Description")}
            {...register("description")}
            type="textarea"
            rows={3}
          />
        </DialogContent>
        <DialogFooter>
          <Button type="submit" disabled={isCreating}>
            {__("Link")}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
