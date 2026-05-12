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
  Badge,
  Card,
  IconChevronDown,
  IconChevronRight,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@probo/ui";
import { type ReactNode, useState } from "react";
import { graphql, useFragment } from "react-relay";

import type { ScopeCardFragment$key } from "#/__generated__/core/ScopeCardFragment.graphql";

import { CreateNodeDialog } from "./CreateNodeDialog";
import { CreateProcessDialog } from "./CreateProcessDialog";
import { CreateThreatDialog } from "./CreateThreatDialog";
import { NodeActions } from "./NodeActions";
import { ProcessActions } from "./ProcessActions";
import { ScopeActions } from "./ScopeActions";
import { ScopeDiagram } from "./ScopeDiagram";
import { ThreatActions } from "./ThreatActions";

export const scopeCardFragment = graphql`
  fragment ScopeCardFragment on RiskAssessmentScope {
    id
    name
    description
    nodes(first: 100)
      @connection(key: "RiskAssessmentScope_nodes", filters: []) {
      __id
      edges {
        node { id nodeType name }
      }
    }
    processes(first: 100)
      @connection(key: "RiskAssessmentScope_processes", filters: []) {
      __id
      edges {
        node { id sourceNodeId targetNodeId name }
      }
    }
    threats(first: 100)
      @connection(key: "RiskAssessmentScope_threats", filters: []) {
      __id
      edges {
        node { id processId name category }
      }
    }
    ...ScopeDiagram_scope
  }
`;

function SectionHeader(props: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{props.title}</h3>
        {props.children}
      </div>
      {props.hint && (
        <p className="text-xs text-txt-tertiary mt-1">{props.hint}</p>
      )}
    </div>
  );
}

export function ScopeCard(props: {
  scopeRef: ScopeCardFragment$key;
  scopesConnectionId: string;
}) {
  const { __ } = useTranslate();
  const [isOpen, setIsOpen] = useState(true);
  const scope = useFragment(scopeCardFragment, props.scopeRef);
  const { scopesConnectionId } = props;

  const nodes = scope.nodes?.edges.map(e => e.node) ?? [];
  const processes = scope.processes?.edges.map(e => e.node) ?? [];
  const threats = scope.threats?.edges.map(e => e.node) ?? [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const nodesConnId = scope.nodes?.__id ?? "";
  const processesConnId = scope.processes?.__id ?? "";
  const threatsConnId = scope.threats?.__id ?? "";

  const ChevronIcon = isOpen ? IconChevronDown : IconChevronRight;

  return (
    <Card>
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3"
        onClick={() => setIsOpen(v => !v)}
      >
        <div className="text-left">
          <h3 className="text-sm font-semibold">{scope.name}</h3>
          {scope.description && (
            <p className="text-xs text-txt-secondary mt-0.5">{scope.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-txt-tertiary">
            {nodes.length}
            {" "}
            {__("nodes")}
            {" · "}
            {processes.length}
            {" "}
            {__("processes")}
            {" · "}
            {threats.length}
            {" "}
            {__("threats")}
          </span>
          <div
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          >
            <ScopeActions
              scope={{ id: scope.id, name: scope.name, description: scope.description ?? "" }}
              connectionId={scopesConnectionId}
            />
          </div>
          <ChevronIcon size={16} className="text-txt-tertiary" />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border-low px-4 py-4 space-y-6">
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-semibold">{__("Diagram")}</h3>
              <p className="text-xs text-txt-tertiary mt-1">
                {__("Visualization of nodes, processes, and threats in this scope.")}
              </p>
            </div>
            <ScopeDiagram scopeKey={scope} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <SectionHeader
                title={`${__("Nodes")} (${nodes.length})`}
                hint={__("Entities, boundaries, assets, and data involved in this scope.")}
              >
                <CreateNodeDialog scopeId={scope.id} connectionId={nodesConnId} />
              </SectionHeader>
              <Table>
                <Thead>
                  <Tr>
                    <Th>{__("Name")}</Th>
                    <Th>{__("Type")}</Th>
                    <Th className="w-12" />
                  </Tr>
                </Thead>
                <Tbody>
                  {nodes.map(node => (
                    <Tr key={node.id}>
                      <Td className="font-medium">{node.name}</Td>
                      <Td><Badge>{node.nodeType}</Badge></Td>
                      <Td>
                        <NodeActions
                          node={{ id: node.id, name: node.name, nodeType: node.nodeType }}
                          connectionId={nodesConnId}
                        />
                      </Td>
                    </Tr>
                  ))}
                  {nodes.length === 0 && (
                    <Tr>
                      <Td colSpan={3} className="text-center text-txt-secondary">{__("No nodes")}</Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </div>

            <div>
              <SectionHeader
                title={`${__("Processes")} (${processes.length})`}
                hint={__("Data flows and interactions between nodes.")}
              >
                <CreateProcessDialog
                  scopeId={scope.id}
                  nodes={nodes.map(n => ({ id: n.id, name: n.name }))}
                  connectionId={processesConnId}
                />
              </SectionHeader>
              <Table>
                <Thead>
                  <Tr>
                    <Th>{__("Name")}</Th>
                    <Th>{__("From")}</Th>
                    <Th>{__("To")}</Th>
                    <Th className="w-12" />
                  </Tr>
                </Thead>
                <Tbody>
                  {processes.map(process => (
                    <Tr key={process.id}>
                      <Td className="font-medium">{process.name}</Td>
                      <Td className="text-txt-secondary">{nodeMap.get(process.sourceNodeId)?.name ?? "—"}</Td>
                      <Td className="text-txt-secondary">{nodeMap.get(process.targetNodeId)?.name ?? "—"}</Td>
                      <Td>
                        <ProcessActions
                          process={{ id: process.id, name: process.name }}
                          connectionId={processesConnId}
                        />
                      </Td>
                    </Tr>
                  ))}
                  {processes.length === 0 && (
                    <Tr>
                      <Td colSpan={4} className="text-center text-txt-secondary">{__("No processes")}</Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </div>
          </div>

          <div>
            <SectionHeader
              title={`${__("Threats")} (${threats.length})`}
              hint={__("Potential threats targeting a process. Link threats to risks via scenarios.")}
            >
              <CreateThreatDialog
                scopeId={scope.id}
                processes={processes.map(p => ({ id: p.id, name: p.name }))}
                connectionId={threatsConnId}
              />
            </SectionHeader>
            <Table>
              <Thead>
                <Tr>
                  <Th>{__("Threat")}</Th>
                  <Th>{__("Category")}</Th>
                  <Th>{__("Process")}</Th>
                  <Th className="w-12" />
                </Tr>
              </Thead>
              <Tbody>
                {threats.map((threat) => {
                  const process = processes.find(p => p.id === threat.processId);
                  return (
                    <Tr key={threat.id}>
                      <Td className="font-medium">{threat.name}</Td>
                      <Td><Badge>{threat.category}</Badge></Td>
                      <Td className="text-txt-secondary">{process?.name ?? "—"}</Td>
                      <Td>
                        <ThreatActions
                          threat={{ id: threat.id, name: threat.name, category: threat.category }}
                          connectionId={threatsConnId}
                        />
                      </Td>
                    </Tr>
                  );
                })}
                {threats.length === 0 && (
                  <Tr>
                    <Td colSpan={4} className="text-center text-txt-secondary">{__("No threats")}</Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
        </div>
      )}
    </Card>
  );
}
