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
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@probo/ui";
import { graphql, useFragment } from "react-relay";
import { useOutletContext } from "react-router";

import type { RiskScenariosTabFragment$key } from "#/__generated__/core/RiskScenariosTabFragment.graphql";

import { CreateScenarioDialog } from "../_components/CreateScenarioDialog";
import { ScenarioActions } from "../_components/ScenarioActions";

const fragment = graphql`
  fragment RiskScenariosTabFragment on Risk {
    id
    scenarios(first: 100)
      @connection(key: "RiskScenariosTab_scenarios", filters: []) {
      __id
      edges {
        node {
          id
          name
          description
        }
      }
    }
  }
`;

export default function RiskScenariosTab() {
  const { __ } = useTranslate();
  const { risk: key } = useOutletContext<{
    risk: RiskScenariosTabFragment$key;
  }>();
  const data = useFragment<RiskScenariosTabFragment$key>(fragment, key);
  const scenarios = data.scenarios.edges.map(e => e.node);
  const connectionId = data.scenarios.__id;
  const riskId = data.id;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateScenarioDialog
          riskId={riskId}
          connectionId={connectionId}
        />
      </div>
      <table className="w-full">
        <Thead>
          <Tr>
            <Th>{__("Scenario")}</Th>
            <Th>{__("Description")}</Th>
            <Th className="w-12" />
          </Tr>
        </Thead>
        <Tbody>
          {scenarios.map(scenario => (
            <Tr key={scenario.id}>
              <Td className="font-medium">{scenario.name}</Td>
              <Td className="text-txt-secondary">
                {scenario.description || "—"}
              </Td>
              <Td>
                <ScenarioActions
                  scenarioId={scenario.id}
                  connectionId={connectionId}
                />
              </Td>
            </Tr>
          ))}
          {scenarios.length === 0 && (
            <Tr>
              <Td colSpan={3} className="text-center text-txt-secondary">
                {__("No scenarios linked to this risk yet.")}
              </Td>
            </Tr>
          )}
        </Tbody>
      </table>
    </div>
  );
}
